"""
Settings and messaging, account recovery and invitations, agency, personal API keys,
and the money and checklist of a group trip.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, col, select

from app.core.config import settings
from app.core.db import engine
from app.core.dependencies import get_current_agent, get_current_user, verify_trip_access
from app.models.family import Family
from app.models.phase4 import Agency, ApiKey, AuthToken, ChecklistItem, Expense, OutboundMessage, UserSettings
from app.models.user import User
from app.schemas.auth import TokenPayload
from app.services import message_service as ms
from app.services import notification_service as ns
from app.services.user_service import UserService

logger = logging.getLogger(__name__)
router = APIRouter()


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


# ======================================================================
# Settings and messaging
# ======================================================================

class SettingsPatch(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=30)
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    email_types: Optional[List[str]] = None
    sms_types: Optional[List[str]] = None


def _settings_view(user: User, s: UserSettings, agency: Optional[Agency]) -> Dict[str, Any]:
    return {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "phone": s.phone,
        "email_enabled": s.email_enabled,
        "sms_enabled": s.sms_enabled,
        "email_types": s.email_types or ms.EMAIL_DEFAULT,
        "sms_types": s.sms_types or ms.SMS_DEFAULT,
        "channels": {"email": ms.email_configured(), "sms": ms.sms_configured()},
        "event_types": [{"name": k, "description": v} for k, v in ns.EVENTS.items() if k != "webhook.test"],
        "agency": {"id": str(agency.id), "name": agency.name, "join_code": agency.join_code if user.role == "agent" else None} if agency else None,
    }


@router.get("/settings")
async def get_settings(me: TokenPayload = Depends(get_current_user)) -> Any:
    with Session(engine) as session:
        user = session.get(User, UUID(me.sub))
        s = ms.settings_for(session, user.id)
        agency = session.get(Agency, s.agency_id) if s.agency_id else None
        return _settings_view(user, s, agency)


@router.put("/settings")
async def update_settings(body: SettingsPatch, me: TokenPayload = Depends(get_current_user)) -> Any:
    changes = body.model_dump(exclude_unset=True)
    for key in ("email_types", "sms_types"):
        if key in changes and changes[key] is not None:
            unknown = [x for x in changes[key] if x not in ns.EVENTS]
            if unknown:
                raise HTTPException(status_code=400, detail=f"Unknown events: {', '.join(unknown)}")
    phone = changes.get("phone")
    if phone:
        cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
        if not cleaned.startswith("+") or len(cleaned) < 9:
            raise HTTPException(status_code=400, detail="Enter the number with its country code, like +919876543210")
        changes["phone"] = cleaned
    with Session(engine) as session:
        user = session.get(User, UUID(me.sub))
        s = session.get(UserSettings, user.id) or UserSettings(user_id=user.id)
        if "full_name" in changes and changes["full_name"]:
            user.full_name = changes.pop("full_name").strip()
            session.add(user)
        else:
            changes.pop("full_name", None)
        for k, v in changes.items():
            setattr(s, k, v if v is not None or k == "phone" else getattr(s, k))
        session.add(s)
        session.commit()
        session.refresh(user)
        session.refresh(s)
        agency = session.get(Agency, s.agency_id) if s.agency_id else None
        return _settings_view(user, s, agency)


class TestMessage(BaseModel):
    channel: str = Field(pattern="^(email|sms)$")


@router.post("/settings/test")
async def send_test(body: TestMessage, me: TokenPayload = Depends(get_current_user)) -> Any:
    with Session(engine) as session:
        user = session.get(User, UUID(me.sub))
        s = ms.settings_for(session, user.id)
    if body.channel == "sms":
        if not s.phone:
            raise HTTPException(status_code=400, detail="Add a phone number first")
        mid = ms.queue_message("sms", s.phone, "Test text from Merydian. If you can read this, texts reach you.", user_id=user.id, kind="test")
    else:
        mid = ms.queue_message("email", user.email, "If you can read this, email notifications reach you.", subject="Test email from Merydian", user_id=user.id, kind="test")
    return {"queued": bool(mid)}


@router.get("/settings/messages")
async def my_messages(me: TokenPayload = Depends(get_current_user)) -> Any:
    return {"messages": ms.recent_for(UUID(me.sub)), "channels": {"email": ms.email_configured(), "sms": ms.sms_configured()}}


@router.get("/dev/outbox")
async def dev_outbox(to: Optional[str] = None) -> Any:
    """Local testing only (DEV_OUTBOX=true): the latest messages with their bodies, so a reset link can be read."""
    if not settings.DEV_OUTBOX:
        raise HTTPException(status_code=404, detail="Not found")
    with Session(engine) as session:
        stmt = select(OutboundMessage).order_by(col(OutboundMessage.created_at).desc()).limit(20)
        if to:
            stmt = stmt.where(OutboundMessage.to == to)
        return {"messages": [{"to": m.to, "subject": m.subject, "body": m.body, "kind": m.kind, "status": m.status} for m in session.exec(stmt).all()]}


# ======================================================================
# Password reset and invitations
# ======================================================================

def issue_token(user_id: UUID, purpose: str, hours: int) -> str:
    raw = secrets.token_urlsafe(32)
    with Session(engine) as session:
        session.add(AuthToken(token_hash=_hash(raw), user_id=user_id, purpose=purpose, expires_at=datetime.utcnow() + timedelta(hours=hours)))
        session.commit()
    return raw


def send_invite(user: User, inviter: Optional[str] = None) -> str:
    """Email an invitation to set a password and return the link, so an agent can also copy it."""
    raw = issue_token(user.id, "invite", 24 * 7)
    link = ms.app_url(f"/reset?token={raw}&invite=1")
    who = f"{inviter} has" if inviter else "You have been"
    ms.queue_message("email", user.email, f"{who} set up a Merydian account for you.\n\nChoose your password to sign in and see your trip:\n{link}\n\nThis link works once and expires in 7 days.", subject="Your Merydian invitation", user_id=user.id, kind="invite")
    return link


class ForgotIn(BaseModel):
    email: str


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


@router.post("/auth/forgot")
async def forgot_password(body: ForgotIn) -> Any:
    """Always answers the same way, so it cannot be used to find out who has an account."""
    user = UserService.get_user_by_email(body.email.strip())
    if user and user.is_active:
        raw = issue_token(user.id, "reset", 1)
        link = ms.app_url(f"/reset?token={raw}")
        ms.queue_message("email", user.email, f"Someone asked to reset the password for this Merydian account.\n\nChoose a new password:\n{link}\n\nThis link works once and expires in an hour. If it was not you, ignore this message.", subject="Reset your Merydian password", user_id=user.id, kind="reset")
    return {"message": "If that email has an account, a reset link is on its way."}


def _live_token(session: Session, raw: str) -> AuthToken:
    t = session.get(AuthToken, _hash(raw))
    if not t or t.used_at is not None or t.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="That link has expired or was already used. Ask for a new one.")
    return t


@router.get("/auth/token-info")
async def token_info(token: str) -> Any:
    with Session(engine) as session:
        t = _live_token(session, token)
        user = session.get(User, t.user_id)
        return {"purpose": t.purpose, "email": user.email if user else None, "full_name": user.full_name if user else None}


@router.post("/auth/reset")
async def reset_password(body: ResetIn) -> Any:
    with Session(engine) as session:
        t = _live_token(session, body.token)
        user = session.get(User, t.user_id)
        if not user:
            raise HTTPException(status_code=400, detail="That link is not valid.")
        user.hashed_password = UserService.get_password_hash(body.password)
        t.used_at = datetime.utcnow()
        session.add(user)
        session.add(t)
        session.commit()
        return {"message": "Password set. You can sign in now.", "email": user.email}


@router.post("/agent/customers/{family_id}/invite")
async def resend_invite(family_id: UUID, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    from app.services.agency_service import ensure_family_visible

    with Session(engine) as session:
        ensure_family_visible(session, agent.sub, family_id)
        user = session.exec(select(User).where(User.family_id == family_id).order_by(User.created_at)).first()
        me = session.get(User, UUID(agent.sub))
    if not user:
        raise HTTPException(status_code=404, detail="No account on that family")
    link = send_invite(user, me.full_name if me else None)
    return {"invite_link": link, "email_configured": ms.email_configured()}


# ======================================================================
# Personal API keys (agents)
# ======================================================================

class KeyIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)


def _key_dict(k: ApiKey) -> Dict[str, Any]:
    return {
        "id": str(k.id), "name": k.name, "prefix": k.prefix, "created_at": k.created_at.isoformat(),
        "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None, "revoked": k.revoked_at is not None,
    }


@router.get("/agent/api-keys")
async def list_keys(agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        rows = session.exec(select(ApiKey).where(ApiKey.owner_id == UUID(agent.sub)).order_by(col(ApiKey.created_at).desc())).all()
        return {"keys": [_key_dict(k) for k in rows]}


@router.post("/agent/api-keys", status_code=201)
async def create_key(body: KeyIn, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    raw = "mk_" + secrets.token_urlsafe(32)
    with Session(engine) as session:
        active = len([k for k in session.exec(select(ApiKey).where(ApiKey.owner_id == UUID(agent.sub))).all() if k.revoked_at is None])
        if active >= 10:
            raise HTTPException(status_code=400, detail="You can have up to 10 active keys")
        k = ApiKey(owner_id=UUID(agent.sub), name=body.name.strip(), prefix=raw[:10], key_hash=_hash(raw))
        session.add(k)
        session.commit()
        session.refresh(k)
        return {**_key_dict(k), "key": raw}  # shown once


@router.delete("/agent/api-keys/{key_id}")
async def revoke_key(key_id: UUID, agent: TokenPayload = Depends(get_current_agent)) -> Any:
    with Session(engine) as session:
        k = session.get(ApiKey, key_id)
        if not k or str(k.owner_id) != agent.sub:
            raise HTTPException(status_code=404, detail="Key not found")
        k.revoked_at = datetime.utcnow()
        session.add(k)
        session.commit()
        return {"revoked": True}


# ======================================================================
# Group trips: shared money and a shared checklist
# ======================================================================

def _trip_families(trip_id: str) -> List[Family]:
    from app.services.trip_service import TripService

    trip = TripService.get_trip(trip_id)
    ids: List[UUID] = []
    for f in (trip.family_ids if trip else []) or []:
        try:
            u = UUID(str(f))
        except ValueError:
            continue
        if u not in ids:
            ids.append(u)
    with Session(engine) as session:
        return [fam for fam in (session.get(Family, i) for i in ids) if fam]


def _family_names(trip_id: str) -> Dict[str, str]:
    with Session(engine) as session:
        out: Dict[str, str] = {}
        for fam in _trip_families(trip_id):
            who = session.exec(select(User).where(User.family_id == fam.id).order_by(User.created_at)).first()
            out[str(fam.id)] = (who.full_name if who and who.full_name else fam.family_code)
        return out


class ExpenseIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    amount: float = Field(gt=0, le=10_000_000)
    paid_by: Optional[UUID] = None
    split_among: List[UUID] = Field(default_factory=list)


def _my_family(me: TokenPayload) -> Optional[UUID]:
    return UUID(me.family_id) if me.family_id else None


@router.get("/trips/{trip_id}/expenses")
async def list_expenses(trip_id: str, me: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    names = _family_names(trip_id)
    with Session(engine) as session:
        rows = session.exec(select(Expense).where(Expense.trip_id == trip_id).order_by(col(Expense.created_at).desc())).all()
    paid: Dict[str, float] = {f: 0.0 for f in names}
    owed: Dict[str, float] = {f: 0.0 for f in names}
    for e in rows:
        share_ids = [f for f in (e.split_among or []) if f in names] or list(names)
        paid[str(e.paid_by)] = paid.get(str(e.paid_by), 0.0) + e.amount
        for f in share_ids:
            owed[f] = owed.get(f, 0.0) + e.amount / len(share_ids)
    net = {f: round(paid.get(f, 0.0) - owed.get(f, 0.0), 2) for f in names}
    # Who pays whom: settle the biggest debtor against the biggest creditor until everyone is square
    debtors = sorted([[f, -v] for f, v in net.items() if v < -0.5], key=lambda x: -x[1])
    creditors = sorted([[f, v] for f, v in net.items() if v > 0.5], key=lambda x: -x[1])
    settlements = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        pay = round(min(debtors[i][1], creditors[j][1]), 2)
        settlements.append({"from": debtors[i][0], "from_name": names[debtors[i][0]], "to": creditors[j][0], "to_name": names[creditors[j][0]], "amount": pay})
        debtors[i][1] -= pay
        creditors[j][1] -= pay
        if debtors[i][1] <= 0.5:
            i += 1
        if creditors[j][1] <= 0.5:
            j += 1
    return {
        "families": [{"family_id": f, "name": n, "paid": round(paid.get(f, 0.0), 2), "share": round(owed.get(f, 0.0), 2), "net": net[f], "you": str(_my_family(me)) == f} for f, n in names.items()],
        "expenses": [
            {"id": str(e.id), "title": e.title, "amount": e.amount, "paid_by": str(e.paid_by), "paid_by_name": names.get(str(e.paid_by), "A family"), "split_among": e.split_among or [], "created_at": e.created_at.isoformat()}
            for e in rows
        ],
        "total": round(sum(e.amount for e in rows), 2),
        "settlements": settlements,
    }


@router.post("/trips/{trip_id}/expenses", status_code=201)
async def add_expense(trip_id: str, body: ExpenseIn, me: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    names = _family_names(trip_id)
    payer = body.paid_by or _my_family(me)
    if not payer or str(payer) not in names:
        raise HTTPException(status_code=400, detail="Choose which family paid")
    if me.role != "agent" and str(payer) != me.family_id:
        raise HTTPException(status_code=403, detail="You can only record what your own family paid")
    split = [str(s) for s in body.split_among if str(s) in names]
    with Session(engine) as session:
        e = Expense(trip_id=trip_id, paid_by=payer, title=body.title.strip(), amount=body.amount, split_among=split)
        session.add(e)
        session.commit()
    ns.notify_trip_travellers(trip_id, "booking.updated", f"Shared expense: {body.title.strip()}", f"{names.get(str(payer))} paid ₹{body.amount:,.0f}", f"/app/trip/{trip_id}/group", {"trip_id": trip_id})
    return {"ok": True}


@router.delete("/trips/{trip_id}/expenses/{expense_id}")
async def delete_expense(trip_id: str, expense_id: UUID, me: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    with Session(engine) as session:
        e = session.get(Expense, expense_id)
        if not e or e.trip_id != trip_id:
            raise HTTPException(status_code=404, detail="Expense not found")
        if me.role != "agent" and str(e.paid_by) != me.family_id:
            raise HTTPException(status_code=403, detail="Only the family that paid can remove it")
        session.delete(e)
        session.commit()
        return {"deleted": True}


class ChecklistIn(BaseModel):
    text: str = Field(min_length=1, max_length=300)


@router.get("/trips/{trip_id}/checklist")
async def checklist(trip_id: str, me: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    names = _family_names(trip_id)
    with Session(engine) as session:
        rows = session.exec(select(ChecklistItem).where(ChecklistItem.trip_id == trip_id).order_by(ChecklistItem.done, ChecklistItem.created_at)).all()
    return {"items": [{"id": str(i.id), "text": i.text, "done": i.done, "added_by": names.get(str(i.added_by)) if i.added_by else "Agent", "created_at": i.created_at.isoformat()} for i in rows]}


@router.post("/trips/{trip_id}/checklist", status_code=201)
async def add_item(trip_id: str, body: ChecklistIn, me: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    with Session(engine) as session:
        item = ChecklistItem(trip_id=trip_id, text=body.text.strip(), added_by=_my_family(me))
        session.add(item)
        session.commit()
        session.refresh(item)
        return {"id": str(item.id)}


@router.patch("/trips/{trip_id}/checklist/{item_id}")
async def tick_item(trip_id: str, item_id: UUID, done: bool, me: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    with Session(engine) as session:
        item = session.get(ChecklistItem, item_id)
        if not item or item.trip_id != trip_id:
            raise HTTPException(status_code=404, detail="Item not found")
        item.done = done
        session.add(item)
        session.commit()
        return {"done": done}


@router.delete("/trips/{trip_id}/checklist/{item_id}")
async def remove_item(trip_id: str, item_id: UUID, me: TokenPayload = Depends(get_current_user), _: Any = Depends(verify_trip_access)) -> Any:
    with Session(engine) as session:
        item = session.get(ChecklistItem, item_id)
        if not item or item.trip_id != trip_id:
            raise HTTPException(status_code=404, detail="Item not found")
        session.delete(item)
        session.commit()
        return {"deleted": True}
