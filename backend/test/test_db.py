import sys
import os
import logging
from sqlalchemy import text

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    logger.info("Testing database connection...")
    try:
        # Try to connect and execute a simple query
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            logger.info("Connection successful! Database responded with: %s", result.fetchone()[0])
            return True
    except Exception as e:
        logger.error("Connection failed: %s", e)
        return False

if __name__ == "__main__":
    if test_connection():
        sys.exit(0)
    else:
        sys.exit(1)
