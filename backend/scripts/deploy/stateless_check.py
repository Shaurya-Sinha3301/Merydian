"""
Milestone 2 proof: the optimizer keeps no state on disk, so any worker can run any job.

Needs SQLALCHEMY_DATABASE_URI (an empty scratch database, already migrated with scripts/db_bootstrap.py)
and REDIS_URL. The language model is optional: without a valid key the pipeline uses its rule-based path.
Run from backend/:  python scripts/deploy/stateless_check.py
"""
import json
import os
import shutil
import sys
import tempfile
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent
sys.path[:0] = [str(BACKEND_DIR), str(REPO_DIR)]

# Point the old storage settings at a folder that does not exist. If anything still writes there, we see it.
_gone = Path(tempfile.mkdtemp(prefix="merydian_nodisk_"))
shutil.rmtree(_gone)
os.environ["TRIP_SESSION_STORAGE"] = str(_gone / "trip_sessions")
os.environ["OPTIMIZER_OUTPUT_DIR"] = str(_gone / "optimizer_outputs")

ok = True


def check(label, cond, extra=""):
    global ok
    ok = ok and bool(cond)
    print(("PASS " if cond else "FAIL ") + label + (f"  [{extra}]" if extra else ""), flush=True)


def files_under(*dirs):
    found = set()
    for d in dirs:
        if d.exists():
            found |= {str(p) for p in d.rglob("*") if p.is_file()}
    return found


WATCHED = [BACKEND_DIR / "trip_sessions", BACKEND_DIR / "optimizer_outputs", REPO_DIR / "agents" / "tests"]
before = files_under(*WATCHED)

from sqlmodel import Session, select  # noqa: E402

from app.core.db import engine  # noqa: E402
from app.models.agent_job import JobStatus, JobType  # noqa: E402
from app.models.trip_iteration import TripIteration  # noqa: E402
from app.models.trip_session import TripSession  # noqa: E402
from app.services import iteration_service  # noqa: E402


def iterations(trip_id):
    with Session(engine) as s:
        return s.exec(select(TripIteration).where(TripIteration.trip_id == trip_id).order_by(TripIteration.iteration)).all()


# 1. demo seed --------------------------------------------------------------------------------------
print("\n== Demo seed")
from app.services.demo_seed import seed_all  # noqa: E402

seed_all()
with Session(engine) as s:
    seeded = s.exec(select(TripSession)).all()
counts = [len(iterations(t.trip_id)) for t in seeded]
check("every seeded trip has its two versions recorded as iterations", seeded and all(c == 2 for c in counts), f"{len(seeded)} trips")
check("the seed wrote nothing to disk", not _gone.exists())

# 2. a new trip's first plan --------------------------------------------------------------------------
print("\n== First plan for a new trip")
from app.services.trip_service import TripService  # noqa: E402

family = "DEMO_FAM_VACATION"
init = TripService.initialize_trip_with_optimization(
    trip_name=f"No-disk check {uuid.uuid4().hex[:4]}", destination="Delhi, India",
    start_date="2026-12-10", end_date="2026-12-12", family_ids=[family], num_travellers=2,
)
trip_id = init["trip_id"]
its = iterations(trip_id)
check("the optimizer's first plan is recorded as iteration 0", len(its) == 1 and its[0].kind == "initial" and its[0].iteration == 0,
      f"optimizer ran: {init.get('optimizer_ran')}")
check("the record keeps the inputs, so the plan is reproducible", bool(its and its[0].input_snapshot.get("preferences")))
check("before approval the plan is readable from the database", bool((iteration_service.latest_result(trip_id) or {}).get("days")))

# 3. approval, then a replan through the real background-job path --------------------------------------
print("\n== Replan through the background job, with no folders anywhere")
from app.services.itinerary_service import ItineraryService  # noqa: E402

ids = ItineraryService.publish_base_itinerary(trip_id=trip_id, family_ids=[family], itinerary_data=iteration_service.latest_result(trip_id))
TripService.update_trip_itinerary(trip_id=trip_id, itinerary_id=ids[0])

from app.services.agent_job_service import AgentJobService  # noqa: E402
from app.workers.agent_tasks import execute_agent_job_task  # noqa: E402


def replan(message):
    job = AgentJobService.create_job(JobType.AGENT_FEEDBACK, trip_id=trip_id, input_payload={"family_id": family, "message": message})
    AgentJobService.queue_job(job.id)
    try:
        execute_agent_job_task.apply(args=[str(job.id)])
    except Exception:
        pass
    return AgentJobService.get_job(job.id)


job = replan("We have a small child and get tired quickly. Please keep the days shorter.")
its = iterations(trip_id)
check("the replan job completes", job.status == JobStatus.COMPLETED, str(job.status))
check("it is recorded as the next iteration, linked to its job", its[-1].kind == "replan" and its[-1].job_id == job.id, f"{len(its)} iterations")

if _gone.exists():
    shutil.rmtree(_gone)
job2 = replan("Please add more time for lunch.")
its2 = iterations(trip_id)
check("with every storage folder deleted, a second replan still works", job2.status == JobStatus.COMPLETED and len(its2) == len(its) + 1)
check("nothing was written to the old storage folders", not _gone.exists())
after = files_under(*WATCHED)
check("nothing new appeared in the repository's runtime folders", after == before, f"{len(after - before)} new file(s)")

# 4. backfill of an old-style trip ----------------------------------------------------------------------
print("\n== Backfill of a trip that only had files")
legacy_dir = Path(tempfile.mkdtemp(prefix="merydian_legacy_"))
legacy_file = legacy_dir / "latest_itinerary.json"
legacy_file.write_text(json.dumps(iteration_service.latest_result(trip_id)), encoding="utf-8")
legacy_trip = f"legacy_{uuid.uuid4().hex[:6]}"
with Session(engine) as s:
    s.add(TripSession(trip_id=legacy_trip, family_ids=[], latest_itinerary_path=str(legacy_file), preferences={}, feedback_history=[]))
    s.commit()
from scripts import backfill_iterations  # noqa: E402

backfill_iterations.main()
first = len(iterations(legacy_trip))
backfill_iterations.main()
check("the old file is imported into the database", first == 1 and iterations(legacy_trip)[0].kind == "backfill")
check("running the backfill again changes nothing", len(iterations(legacy_trip)) == first)
shutil.rmtree(legacy_dir, ignore_errors=True)

print("\nALL PASSED" if ok else "\nSOME CHECKS FAILED")
sys.exit(0 if ok else 1)
