"""
One-off import of optimizer state from the old per-trip files into the trip_iterations table.

Before milestone 2, a trip's plan chain could live in JSON files on the container's disk. For every trip
that has no iterations yet, this records what can still be found: the file the trip pointed at (if it is
readable) and the trip's current approved plan. Trips that already have iterations are left alone, so the
script is safe to run more than once. It prints what it did and what it could not find.

Run from the backend/ directory:  python scripts/backfill_iterations.py
"""
import json
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlmodel import Session, select

from app.core.db import engine
from app.models.itinerary import Itinerary
from app.models.trip_session import TripSession
from app.services import iteration_service
from scripts import migration_tools as mt


def _read(path):
    if not path or not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) and data.get("days") else None
    except Exception:
        return None


def main() -> None:
    mt.register_models()
    with Session(engine) as s:
        trips = s.exec(select(TripSession)).all()
        work = [(t.trip_id, t.baseline_itinerary_path, t.latest_itinerary_path, t.current_itinerary_id) for t in trips]

    skipped = imported = empty = 0
    missing_files = 0
    for trip_id, baseline_path, latest_path, current_id in work:
        if iteration_service.count(trip_id):
            skipped += 1
            continue
        recorded = 0
        for label, path in (("baseline", baseline_path), ("latest", latest_path)):
            data = _read(path)
            if data is None:
                missing_files += int(bool(path))
                continue
            iteration_service.record(trip_id, "backfill", {"source": f"{label} file", "path": os.path.basename(path)}, data)
            recorded += 1
        if current_id:
            with Session(engine) as s:
                itin = s.get(Itinerary, current_id)
            if itin and itin.data:
                iteration_service.record(trip_id, "backfill", {"source": "current approved plan", "itinerary_id": str(current_id),
                                                               "version": itin.version}, itin.data)
                recorded += 1
        if recorded:
            imported += 1
        else:
            empty += 1

    print(f"Trips: {len(work)}. Already had iterations: {skipped}. Imported: {imported}. Nothing to import: {empty}.")
    if missing_files:
        print(f"{missing_files} file path(s) pointed at files that no longer exist; those trips rely on their approved plan.")


if __name__ == "__main__":
    main()
