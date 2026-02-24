"""
Booking Service

Handles all database operations for booking jobs and hotel bookings.
Follows the same static-method pattern as ItineraryOptionService.
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlmodel import Session, select
from app.core.db import engine
from app.models.booking_job import BookingJob, JobStatus
from app.models.hotel_booking import HotelBooking, HotelBookingStatus

logger = logging.getLogger(__name__)


class BookingService:
    """Service for managing booking jobs and hotel bookings in the database."""

    # ------------------------------------------------------------------ #
    #  Booking Jobs
    # ------------------------------------------------------------------ #

    @staticmethod
    def create_job(
        itinerary_id: str,
        agent_id: str,
        items: List[str],
    ) -> BookingJob:
        """
        Create a new booking job record.

        Args:
            itinerary_id: ID of the itinerary being booked
            agent_id: Agent who triggered the booking
            items: List of item types to book (e.g. ["hotel", "flight"])

        Returns:
            Created BookingJob record
        """
        with Session(engine) as session:
            job = BookingJob(
                itinerary_id=itinerary_id,
                agent_id=agent_id,
                status=JobStatus.PENDING.value,
                items_requested=items,
                items_completed={},
            )
            session.add(job)
            session.commit()
            session.refresh(job)
            logger.info("Created booking job %s for itinerary %s", job.id, itinerary_id)
            return job

    @staticmethod
    def get_job(job_id: UUID) -> Optional[BookingJob]:
        """Get a booking job by ID."""
        with Session(engine) as session:
            return session.get(BookingJob, job_id)

    @staticmethod
    def get_job_by_id_str(job_id_str: str) -> Optional[BookingJob]:
        """Get a booking job by string ID."""
        try:
            job_id = UUID(job_id_str)
            return BookingService.get_job(job_id)
        except ValueError:
            return None

    @staticmethod
    def get_jobs_for_agent(agent_id: str) -> List[BookingJob]:
        """Get all booking jobs for an agent, ordered by most recent."""
        with Session(engine) as session:
            stmt = (
                select(BookingJob)
                .where(BookingJob.agent_id == agent_id)
                .order_by(BookingJob.created_at.desc())
            )
            results = session.exec(stmt)
            return list(results.all())

    @staticmethod
    def update_job_status(
        job_id: UUID,
        status: JobStatus,
        items_completed: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        celery_task_id: Optional[str] = None,
    ) -> Optional[BookingJob]:
        """
        Update a booking job's status and optional fields.

        Returns:
            Updated BookingJob or None if not found
        """
        with Session(engine) as session:
            job = session.get(BookingJob, job_id)
            if not job:
                logger.warning("Booking job %s not found for update", job_id)
                return None

            job.status = status.value
            job.updated_at = datetime.utcnow()

            if items_completed is not None:
                job.items_completed = items_completed
            if error_message is not None:
                job.error_message = error_message
            if celery_task_id is not None:
                job.celery_task_id = celery_task_id

            session.add(job)
            session.commit()
            session.refresh(job)
            logger.info("Updated booking job %s → %s", job_id, status.value)
            return job

    # ------------------------------------------------------------------ #
    #  Hotel Bookings
    # ------------------------------------------------------------------ #

    @staticmethod
    def create_hotel_booking(
        job_id: UUID,
        status: HotelBookingStatus = HotelBookingStatus.SEARCHING,
        **kwargs,
    ) -> HotelBooking:
        """
        Create a hotel booking record linked to a job.

        Accepts any HotelBooking field as a kwarg.
        """
        with Session(engine) as session:
            booking = HotelBooking(
                job_id=job_id,
                status=status.value,
                **kwargs,
            )
            session.add(booking)
            session.commit()
            session.refresh(booking)
            logger.info("Created hotel booking %s for job %s", booking.id, job_id)
            return booking

    @staticmethod
    def update_hotel_booking(
        booking_id: UUID,
        **kwargs,
    ) -> Optional[HotelBooking]:
        """
        Update a hotel booking record with arbitrary fields.

        Pass any HotelBooking column name as a kwarg.
        """
        with Session(engine) as session:
            booking = session.get(HotelBooking, booking_id)
            if not booking:
                logger.warning("Hotel booking %s not found", booking_id)
                return None

            for key, value in kwargs.items():
                if hasattr(booking, key):
                    setattr(booking, key, value)

            booking.updated_at = datetime.utcnow()
            session.add(booking)
            session.commit()
            session.refresh(booking)
            logger.info("Updated hotel booking %s", booking_id)
            return booking

    @staticmethod
    def get_hotel_bookings_for_job(job_id: UUID) -> List[HotelBooking]:
        """Get all hotel bookings for a specific job."""
        with Session(engine) as session:
            stmt = (
                select(HotelBooking)
                .where(HotelBooking.job_id == job_id)
                .order_by(HotelBooking.created_at)
            )
            results = session.exec(stmt)
            return list(results.all())

    @staticmethod
    def get_hotel_booking(booking_id: UUID) -> Optional[HotelBooking]:
        """Get a single hotel booking by ID."""
        with Session(engine) as session:
            return session.get(HotelBooking, booking_id)

    @staticmethod
    def get_hotel_booking_by_confirmation(confirmation_no: str) -> Optional[HotelBooking]:
        """Get a hotel booking by its TBO confirmation number."""
        with Session(engine) as session:
            stmt = select(HotelBooking).where(
                HotelBooking.confirmation_no == confirmation_no
            )
            return session.exec(stmt).first()

    @staticmethod
    def cancel_hotel_booking(
        booking_id: UUID,
        refund_amount: Optional[float] = None,
        cancellation_charges: Optional[float] = None,
        cancel_response: Optional[dict] = None,
        error_message: Optional[str] = None,
    ) -> Optional[HotelBooking]:
        """
        Mark a hotel booking as cancelled with refund/charge details.

        Args:
            booking_id: UUID of the hotel booking
            refund_amount: Refund amount from TBO
            cancellation_charges: Charges applied by TBO
            cancel_response: Full TBO Cancel API response
            error_message: Error message if cancellation failed
        """
        with Session(engine) as session:
            booking = session.get(HotelBooking, booking_id)
            if not booking:
                logger.warning("Hotel booking %s not found for cancellation", booking_id)
                return None

            if error_message:
                booking.status = HotelBookingStatus.CANCEL_FAILED.value
                booking.error_message = error_message
            else:
                booking.status = HotelBookingStatus.CANCELLED.value
                booking.cancelled_at = datetime.utcnow()

            if refund_amount is not None:
                booking.refund_amount = refund_amount
            if cancellation_charges is not None:
                booking.cancellation_charges = cancellation_charges
            if cancel_response:
                booking.tbo_cancel_response = cancel_response

            booking.updated_at = datetime.utcnow()
            session.add(booking)
            session.commit()
            session.refresh(booking)
            logger.info("Hotel booking %s cancelled (refund=%.2f, charges=%.2f)",
                        booking_id, refund_amount or 0, cancellation_charges or 0)
            return booking
