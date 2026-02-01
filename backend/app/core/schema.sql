-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Families (Root Entity)
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    current_itinerary_version UUID, -- Optimization: Pointer to active version
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Itineraries (Immutable, Append-Only)
CREATE TABLE IF NOT EXISTS itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    version INT NOT NULL,
    
    -- The complete itinerary snapshot (schema: base_itinerary_final.json)
    data JSONB NOT NULL,
    
    -- Analytics & Debugging
    created_reason TEXT, -- e.g. "Initial Creation", "User Moved Lunch"
    ai_model_used TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Enforce linear history per family
    UNIQUE (family_id, version)
);

-- Index for fast retrieval of the latest version
CREATE INDEX IF NOT EXISTS idx_itineraries_family_version_desc ON itineraries (family_id, version DESC);

-- 3. Itinerary Events (Action Log / Audit Trail)
CREATE TABLE IF NOT EXISTS itinerary_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL, -- e.g. "SWAP_POI", "REGENERATE_DAY"
    payload JSONB NOT NULL,   -- The intent/parameters of the action
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Locations (Reference Data)
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY, -- e.g. "LOC_008" to match JSON IDs
    name TEXT NOT NULL,
    type TEXT, -- "monument", "restaurant", "hotel"
    geo_lat DOUBLE PRECISION,
    geo_lng DOUBLE PRECISION,
    details JSONB, -- specific attributes like "avg_time_spent", "tags"
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_families_current_itinerary ON families(current_itinerary_version);
CREATE INDEX IF NOT EXISTS idx_itinerary_events_family ON itinerary_events(family_id);
