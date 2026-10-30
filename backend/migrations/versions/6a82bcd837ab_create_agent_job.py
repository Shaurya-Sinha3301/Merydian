"""create_agent_job

Revision ID: 6a82bcd837ab
Revises: 5fa08801567f
Create Date: 2026-06-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '6a82bcd837ab'
down_revision = '5fa08801567f'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create Enum Type safely
    job_status_enum = postgresql.ENUM('CREATED', 'QUEUED', 'RUNNING', 'RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED', name='jobstatus')
    job_status_enum.create(op.get_bind(), checkfirst=True)
    
    job_type_enum = postgresql.ENUM('AGENT_TOOLS', 'AGENT_COMMUNICATION', 'AGENT_FEEDBACK', name='jobtype')
    job_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table('agent_jobs',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('job_type', sa.Enum('AGENT_TOOLS', 'AGENT_COMMUNICATION', 'AGENT_FEEDBACK', name='jobtype'), nullable=False),
        sa.Column('status', sa.Enum('CREATED', 'QUEUED', 'RUNNING', 'RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED', name='jobstatus'), nullable=False),
        sa.Column('priority', sa.Integer(), nullable=False),
        sa.Column('created_by_user_id', sqlmodel.sql.sqltypes.GUID(), nullable=True),
        sa.Column('trip_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('itinerary_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('attempt_count', sa.Integer(), nullable=False),
        sa.Column('max_attempts', sa.Integer(), nullable=False),
        sa.Column('worker_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('celery_task_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('error_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('error_message', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('internal_error_details', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('input_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('result_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(op.f('ix_agent_jobs_created_by_user_id'), 'agent_jobs', ['created_by_user_id'], unique=False)
    op.create_index(op.f('ix_agent_jobs_job_type'), 'agent_jobs', ['job_type'], unique=False)
    op.create_index(op.f('ix_agent_jobs_status'), 'agent_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_agent_jobs_trip_id'), 'agent_jobs', ['trip_id'], unique=False)
    op.create_index(op.f('ix_agent_jobs_itinerary_id'), 'agent_jobs', ['itinerary_id'], unique=False)
    op.create_index(op.f('ix_agent_jobs_celery_task_id'), 'agent_jobs', ['celery_task_id'], unique=False)

    op.create_table('agent_job_events',
        sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('job_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column('event_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('previous_status', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('new_status', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('event_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['agent_jobs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_job_events_job_id'), 'agent_job_events', ['job_id'], unique=False)
    op.create_index(op.f('ix_agent_job_events_event_type'), 'agent_job_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_agent_job_events_timestamp'), 'agent_job_events', ['timestamp'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_agent_job_events_timestamp'), table_name='agent_job_events')
    op.drop_index(op.f('ix_agent_job_events_event_type'), table_name='agent_job_events')
    op.drop_index(op.f('ix_agent_job_events_job_id'), table_name='agent_job_events')
    op.drop_table('agent_job_events')
    
    op.drop_index(op.f('ix_agent_jobs_celery_task_id'), table_name='agent_jobs')
    op.drop_index(op.f('ix_agent_jobs_itinerary_id'), table_name='agent_jobs')
    op.drop_index(op.f('ix_agent_jobs_trip_id'), table_name='agent_jobs')
    op.drop_index(op.f('ix_agent_jobs_status'), table_name='agent_jobs')
    op.drop_index(op.f('ix_agent_jobs_job_type'), table_name='agent_jobs')
    op.drop_index(op.f('ix_agent_jobs_created_by_user_id'), table_name='agent_jobs')
    op.drop_table('agent_jobs')
    
    job_status_enum = postgresql.ENUM('CREATED', 'QUEUED', 'RUNNING', 'RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED', name='jobstatus')
    job_status_enum.drop(op.get_bind())
    
    job_type_enum = postgresql.ENUM('AGENT_TOOLS', 'AGENT_COMMUNICATION', 'AGENT_FEEDBACK', name='jobtype')
    job_type_enum.drop(op.get_bind())
