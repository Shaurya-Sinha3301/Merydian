import sys
import os
import logging
from sqlmodel import SQLModel

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import engine
from app.models.user import User
from app.models.family import Family
from app.models.trip_session import TripSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    logger.info("Initializing database...")
    try:
        # Import all models so SQLModel knows about them
        # (Already imported above)
        
        logger.info(f"Connecting to database: {engine.url.render_as_string(hide_password=True)}")
        
        from sqlalchemy import text
        
        logger.warning("Dropping all existing tables to enforce new schema using CASCADE...")
        # SQLModel drop_all fails with circular dependencies, so we nuke the schema
        with engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE;"))
            conn.execute(text("CREATE SCHEMA public;"))
            conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
            conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            conn.commit()
            
        logger.info("Schema reset complete.")
        
        logger.info("Creating new tables...")
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully!")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    init_db()
