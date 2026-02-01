import json
from uuid import UUID
from typing import Optional
from sqlalchemy import text
from sqlmodel import Session
from app.core.db import engine
from app.core.redis import RedisManager
from app.schemas.itinerary import Itinerary

class ItineraryService:
    @staticmethod
    async def get_current_itinerary(family_id: UUID) -> Optional[Itinerary]:
        """
        1. Check Redis for 'family:{id}:itinerary:current'
        2. If miss, fetch latest version from Postgres
        3. Populate Redis
        """
        redis = RedisManager.get_client()
        cache_key = f"family:{family_id}:itinerary:current"
        
        # 1. Try Cache
        cached_data = await redis.get(cache_key)
        if cached_data:
            return Itinerary.parse_raw(cached_data)
            
        # 2. DB Fallback (Zero-Join Read)
        # We query the itinerary directly where it is the current version for the family
        query = text("""
            SELECT i.data 
            FROM itineraries i
            JOIN families f ON f.id = i.family_id
            WHERE f.id = :family_id 
              AND i.id = f.current_itinerary_version
        """)
        
        with Session(engine) as session:
            result = session.exec(query, params={"family_id": family_id}).first()
            
            if not result:
                return None
                
            # result is a tuple, data is the first element
            itinerary_data = result[0]
            
            # 3. Populate Cache (TTL 24h)
            # data is already a dict from jsonb, we need to dump it string for redis
            # Or if sqlalchemy returns dict, pydantic can parse it.
            itinerary = Itinerary.parse_obj(itinerary_data)
            await redis.set(cache_key, itinerary.json(), ex=86400)
            
            return itinerary

    @staticmethod
    async def create_new_version(family_id: UUID, itinerary: Itinerary, reason: str = "Manual Update") -> UUID:
        """
        1. Insert new row in 'itineraries'
        2. Update 'families.current_itinerary_version'
        3. Update Redis
        """
        redis = RedisManager.get_client()
        cache_key = f"family:{family_id}:itinerary:current"
        
        # Calculate new version number
        # Simplification: In real app, might want to lock or use atomic increment
        with Session(engine) as session:
            # Get max version
            max_ver_query = text("SELECT MAX(version) FROM itineraries WHERE family_id = :fid")
            current_max = session.exec(max_ver_query, params={"fid": family_id}).first() or 0
            new_version = current_max + 1
            
            # Insert new itinerary
            insert_query = text("""
                INSERT INTO itineraries (family_id, version, data, created_reason)
                VALUES (:fid, :ver, :data, :reason)
                RETURNING id
            """)
            
            # data needs to be json serialized string for jsonb if using raw param, 
            # or if using sqlalchemy json type it handles dict. 
            # With raw text and psycopg2, usually passing logic json string or adapter.
            # safe bet: pass json string and cast to ::jsonb in SQL if needed, 
            # but sqlmodel/sqlalchemy usually handles dict -> jsonb automatically if bindparam is set correctly.
            # Let's try passing the dict directly.
            
            result = session.exec(
                insert_query, 
                params={
                    "fid": family_id, 
                    "ver": new_version, 
                    "data": itinerary.json(), # passing string to be safe with raw query
                    "reason": reason
                }
            ).first()
            
            new_id = result[0]
            
            # Update Family Pointer
            update_family = text("""
                UPDATE families 
                SET current_itinerary_version = :iid,
                    updated_at = NOW()
                WHERE id = :fid
            """)
            session.exec(update_family, params={"iid": new_id, "fid": family_id})
            
            session.commit()
            
            # 3. Update Redis
            await redis.set(cache_key, itinerary.json(), ex=86400)
            
            return new_id
