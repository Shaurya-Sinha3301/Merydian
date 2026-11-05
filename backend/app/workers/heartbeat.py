"""
Keeps a claimed job's lease alive while its owner works, and notices when ownership is lost.

Used as a context manager around the work. Every JOB_HEARTBEAT_SECONDS it renews the lease, quoting the
owner's fence. If a renewal changes nothing, another worker has taken the job over (this one was paused
past its lease); `lost` is set and the owner stops at its next check and discards its result. Python cannot
stop a running solver from outside, so the decisive guard is the fence check in the transaction that
saves the result: a late owner's write is refused there in any case.
"""
import logging
import threading
import uuid
from typing import Optional

from app.core.config import settings
from app.services.agent_job_service import AgentJobService

logger = logging.getLogger(__name__)


class OwnershipLost(Exception):
    """The job was taken over by another worker while this one held it."""


class Heartbeat:
    def __init__(self, job_id: uuid.UUID, fence: int, interval: Optional[float] = None):
        self.job_id = job_id
        self.fence = fence
        self.interval = interval if interval is not None else settings.JOB_HEARTBEAT_SECONDS
        self.lost = threading.Event()
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def _run(self) -> None:
        while not self._stop.wait(self.interval):
            try:
                if not AgentJobService.heartbeat(self.job_id, self.fence):
                    logger.warning(f"Job {self.job_id}: lease lost (fence {self.fence}); stopping")
                    self.lost.set()
                    return
            except Exception as exc:  # a failed renewal is not a lost lease; try again next beat
                logger.warning(f"Job {self.job_id}: heartbeat failed: {exc}")

    def check(self) -> None:
        if self.lost.is_set():
            raise OwnershipLost(str(self.job_id))

    def __enter__(self) -> "Heartbeat":
        self._thread = threading.Thread(target=self._run, name=f"heartbeat-{self.job_id}", daemon=True)
        self._thread.start()
        return self

    def __exit__(self, *exc) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=5)
