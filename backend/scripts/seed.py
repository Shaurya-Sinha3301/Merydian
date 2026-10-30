"""
Seed the public demo sandbox (idempotent).

    python -m scripts.seed           # create anything missing
    python -m scripts.seed --reset   # wipe demo data first, then re-seed

Run from the backend/ directory (the Docker entrypoint does this when
SEED_ON_START=true).
"""
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.demo_seed import reset_all, seed_all  # noqa: E402


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if "--reset" in sys.argv:
        print("Resetting demo data ...")
        reset_all()
    created = seed_all()
    print(f"Seed complete: {created} trip(s) created.")


if __name__ == "__main__":
    main()
