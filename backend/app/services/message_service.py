"""
Email and text messages.

`queue_message` always records the message. With SMTP or Twilio configured it is sent for real;
without them it is marked "logged", so nothing is lost and the whole flow can be tried locally.
"""

import logging
import smtplib
import threading
from datetime import datetime
from email.message import EmailMessage
from typing import Any, Dict, List, Optional
from uuid import UUID

import requests
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models.phase4 import OutboundMessage, UserSettings
from app.models.user import User

logger = logging.getLogger(__name__)

# What each channel carries unless the person chooses otherwise.
EMAIL_DEFAULT = [
    "decision.created", "decision.accepted", "decision.declined", "plan.published",
    "feedback.processed", "booking.created", "booking.updated", "job.failed",
]
SMS_DEFAULT = ["plan.published", "decision.accepted", "decision.declined", "booking.updated"]


def email_configured() -> bool:
    return bool(settings.SMTP_HOST)


def sms_configured() -> bool:
    return bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM)


def app_url(path: Optional[str]) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    return f"{base}{path}" if path else base


def _send_email(to: str, subject: str, body: str) -> str:
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER or "merydian@localhost"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_TLS:
            smtp.starttls()
        if settings.SMTP_USER:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)
    return "smtp"


def _send_sms(to: str, body: str) -> str:
    r = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
        data={"To": to, "From": settings.TWILIO_FROM, "Body": body[:600]},
        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
        timeout=15,
    )
    if r.status_code >= 300:
        raise RuntimeError(f"Twilio answered {r.status_code}: {r.text[:160]}")
    return "twilio"


def _deliver(message_id: UUID) -> None:
    with Session(engine) as session:
        m = session.get(OutboundMessage, message_id)
        if not m:
            return
        try:
            if m.channel == "email" and email_configured():
                m.provider = _send_email(m.to, m.subject or "Merydian", m.body)
                m.status = "sent"
            elif m.channel == "sms" and sms_configured():
                m.provider = _send_sms(m.to, m.body)
                m.status = "sent"
            else:
                m.provider = "log"
                m.status = "logged"
            m.sent_at = datetime.utcnow()
        except Exception as e:
            m.status = "failed"
            m.error = str(e)[:290]
            logger.error(f"Could not send {m.channel} to {m.to}: {e}")
        session.add(m)
        session.commit()


def queue_message(channel: str, to: str, body: str, subject: Optional[str] = None, user_id: Optional[UUID] = None, kind: str = "notification") -> Optional[UUID]:
    """Store the message and send it in the background. Never raises: a message must not break the action behind it."""
    try:
        with Session(engine) as session:
            m = OutboundMessage(user_id=user_id, channel=channel, to=to, subject=subject, body=body[:4000], kind=kind)
            session.add(m)
            session.commit()
            session.refresh(m)
            mid = m.id
        threading.Thread(target=_deliver, args=(mid,), daemon=True).start()
        return mid
    except Exception as e:
        logger.error(f"Could not queue {channel} message: {e}")
        return None


def settings_for(session: Session, user_id: UUID) -> UserSettings:
    row = session.get(UserSettings, user_id)
    if row is None:
        row = UserSettings(user_id=user_id)
    return row


def fan_out(user_ids: List[UUID], type: str, title: str, body: str, link: Optional[str]) -> None:
    """Email and text the people who want this kind of notice."""
    try:
        with Session(engine) as session:
            users = {u.id: u for u in session.exec(select(User).where(User.id.in_(user_ids))).all()}  # type: ignore[attr-defined]
            prefs = {uid: settings_for(session, uid) for uid in user_ids}
        for uid in user_ids:
            u, p = users.get(uid), prefs[uid]
            if not u:
                continue
            text = f"{title}\n\n{body}\n\n{app_url(link)}".strip() if link else f"{title}\n\n{body}".strip()
            if p.email_enabled and u.email and type in (p.email_types or EMAIL_DEFAULT):
                queue_message("email", u.email, text, subject=title, user_id=uid)
            if p.sms_enabled and p.phone and type in (p.sms_types or SMS_DEFAULT):
                queue_message("sms", p.phone, f"{title} {app_url(link)}".strip(), user_id=uid)
    except Exception as e:
        logger.error(f"Could not fan out {type}: {e}", exc_info=True)


def recent_for(user_id: UUID, limit: int = 20) -> List[Dict[str, Any]]:
    with Session(engine) as session:
        rows = session.exec(
            select(OutboundMessage).where(OutboundMessage.user_id == user_id).order_by(OutboundMessage.created_at.desc()).limit(limit)
        ).all()
        return [
            {"id": str(m.id), "channel": m.channel, "to": m.to, "subject": m.subject, "kind": m.kind, "status": m.status, "provider": m.provider, "error": m.error, "created_at": m.created_at.isoformat()}
            for m in rows
        ]
