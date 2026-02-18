"""
Database migration script to add new fields to trip_sessions table

Adds:
- destination (VARCHAR)
- start_date (TIMESTAMP)
- end_date (TIMESTAMP)
- initial_preferences (JSONB)
- last_optimization_at (TIMESTAMP)
- Renames preferences to current_preferences
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI")

def run_migration():
    """Run the migration to add new fields to trip_sessions table"""
    
    if not DATABASE_URI:
        print("❌ ERROR: SQLALCHEMY_DATABASE_URI not found in .env")
        return
    
    print("🔧 Starting database migration for trip_sessions table...")
    print(f"   Database: {DATABASE_URI.split('@')[1] if '@' in DATABASE_URI else 'hidden'}")
    
    engine = create_engine(DATABASE_URI)
    
    migrations = [
        # Add new columns
        ("destination", "ALTER TABLE trip_sessions ADD COLUMN IF NOT EXISTS destination VARCHAR(200)"),
        ("start_date", "ALTER TABLE trip_sessions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP"),
        ("end_date", "ALTER TABLE trip_sessions ADD COLUMN IF NOT EXISTS end_date TIMESTAMP"),
        ("initial_preferences", "ALTER TABLE trip_sessions ADD COLUMN IF NOT EXISTS initial_preferences JSONB DEFAULT '{}'::jsonb"),
        ("last_optimization_at", "ALTER TABLE trip_sessions ADD COLUMN IF NOT EXISTS last_optimization_at TIMESTAMP"),
        
        # Check if we need to rename preferences to current_preferences
        ("current_preferences", """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'trip_sessions' AND column_name = 'preferences'
                ) THEN
                    ALTER TABLE trip_sessions RENAME COLUMN preferences TO current_preferences;
                END IF;
            EXCEPTION WHEN duplicate_column THEN
                -- Column already renamed, do nothing
                NULL;
            END $$;
        """),
    ]
    
    with engine.connect() as conn:
        for field_name, migration_sql in migrations:
            try:
                print(f"\n  ✓ Adding/updating field: {field_name}")
                conn.execute(text(migration_sql))
                conn.commit()
                print(f"    ✅ Success")
            except Exception as e:
                print(f"    ⚠ Warning: {e}")
                # Continue with other migrations even if one fails
    
    print("\n✅ Migration completed!")
    print("\nVerifying schema...")
    
    # Verify the columns exist
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trip_sessions'
            ORDER BY ordinal_position
        """))
        
        print("\nCurrent trip_sessions columns:")
        for row in result:
            print(f"  - {row[0]}: {row[1]}")
    
    print("\n✅ All done! You can now run the tests.")

if __name__ == "__main__":
    run_migration()
