"""
Supabase Migration: Add preference_history to trip_sessions

Adds preference_history JSON column to track all preference changes with full audit trail.
"""

from sqlalchemy import text
from app.core.db import engine

def upgrade():
    """Add preference_history column"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE trip_sessions 
            ADD COLUMN IF NOT EXISTS preference_history JSONB DEFAULT '[]'::jsonb
        """))
        conn.commit()
    
    print("✓ Added preference_history column to trip_sessions in Supabase")

def downgrade():
    """Remove preference_history column"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE trip_sessions 
            DROP COLUMN IF EXISTS preference_history
        """))
        conn.commit()
    
    print("✓ Removed preference_history column from trip_sessions")

if __name__ == "__main__":
    print("Running Supabase migration: Add preference_history")
    upgrade()
    print("Migration complete!")
