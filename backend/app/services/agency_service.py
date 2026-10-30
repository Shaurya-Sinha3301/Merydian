"""
Agencies: who may see which customers and trips.

An agent sees the customers and trips of their own agency. People and trips that belong to no
agency make up the shared open desk, which agents without an agency (and the demo) work from.
"""

import logging
import secrets
from typing import List, Optional, Set
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, select

from app.core.db import engine
from app.models.phase4 import Agency, TripMeta, UserSettings
from app.models.trip_session import TripSession
from app.models.user import User

logger = logging.getLogger(__name__)


def agency_of(session: Session, user_id: str | UUID) -> Optional[UUID]:
    row = session.get(UserSettings, UUID(str(user_id)))
    return row.agency_id if row else None


def set_user_agency(user_id: UUID, agency_id: Optional[UUID]) -> None:
    with Session(engine) as session:
        row = session.get(UserSettings, user_id) or UserSettings(user_id=user_id)
        row.agency_id = agency_id
        session.add(row)
        session.commit()


def create_agency(name: str) -> Agency:
    with Session(engine) as session:
        existing = session.exec(select(Agency).where(Agency.name == name)).first()
        if existing:
            raise ValueError("An agency with that name already exists. Ask a colleague for its join code.")
        a = Agency(name=name.strip(), join_code="AG-" + secrets.token_hex(3).upper())
        session.add(a)
        session.commit()
        session.refresh(a)
        return a


def agency_by_code(code: str) -> Optional[Agency]:
    with Session(engine) as session:
        return session.exec(select(Agency).where(Agency.join_code == code.strip().upper())).first()


def trip_agency(session: Session, trip_id: str) -> Optional[UUID]:
    row = session.get(TripMeta, trip_id)
    return row.agency_id if row else None


def set_trip_agency(trip_id: str, agency_id: Optional[UUID]) -> None:
    if agency_id is None:
        return
    with Session(engine) as session:
        row = session.get(TripMeta, trip_id) or TripMeta(trip_id=trip_id)
        row.agency_id = agency_id
        session.add(row)
        session.commit()


def trip_ids_in(session: Session, agency_id: Optional[UUID]) -> Set[str]:
    meta = {m.trip_id: m.agency_id for m in session.exec(select(TripMeta)).all()}
    return {t for t in session.exec(select(TripSession.trip_id)).all() if meta.get(t) == agency_id}


def user_ids_in(session: Session, agency_id: Optional[UUID], role: Optional[str] = None) -> List[UUID]:
    settings = {s.user_id: s.agency_id for s in session.exec(select(UserSettings)).all()}
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    return [u.id for u in session.exec(stmt).all() if settings.get(u.id) == agency_id]


def ensure_trip_visible(agent_sub: str, trip_id: str) -> None:
    with Session(engine) as session:
        if trip_agency(session, trip_id) != agency_of(session, agent_sub):
            raise HTTPException(status_code=404, detail="Trip not found")


def ensure_family_visible(session: Session, agent_sub: str, family_id: UUID) -> None:
    mine = agency_of(session, agent_sub)
    users = session.exec(select(User).where(User.family_id == family_id)).all()
    if not users or any(agency_of(session, u.id) != mine for u in users):
        raise HTTPException(status_code=404, detail="Customer not found")


def agents_for_trip(trip_id: Optional[str]) -> List[UUID]:
    """The agents who should hear about this trip: its agency's agents, or the open desk's."""
    with Session(engine) as session:
        agency = trip_agency(session, trip_id) if trip_id else None
        return user_ids_in(session, agency, "agent")
