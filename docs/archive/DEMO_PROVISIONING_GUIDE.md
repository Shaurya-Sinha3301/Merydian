# Merydian Demo Provisioning Guide

## Overview

Merydian provides a pre-configured demo environment allowing users and travel agents to instantly explore the platform using curated personas. This guide explains how to initialize, reset, and access the demo environment.

## Provisioning the Demo Data

To populate the local PostgreSQL database with demo relational data:

### Using the CLI Script
Run the provisioning script from the backend directory. This will parse the JSON fixtures and construct the users, families, itineraries, and agent jobs.

```bash
cd backend
python scripts/provision_demo_database.py
```

To reset the database (delete existing demo records and recreate them):
```bash
python scripts/provision_demo_database.py --reset
```

### Using the API Endpoint
You can also trigger a reset and reprovisioning programmatically via the API (or through the "Reset Demo DB" button in the Demo Launcher UI):

```http
POST /api/v1/demo/reset
```

## Exploring the Demo Environment

1. Navigate to the root URL (`/`) in your browser to view the **Landing Page**.
2. Click **Explore Demo**.
3. Select from one of the curated personas (e.g., *Family Vacation*, *Luxury Couple*).
4. Launching a persona calls `POST /api/v1/demo/load/{persona}`, which returns a JWT.
5. You will be automatically authenticated and redirected to the **Customer Dashboard**.

## Demo Administrator Access

To oversee all jobs and active trips, you can log in as the Demo Administrator:
- Go to the **Explore Demo** page (`/demo`).
- Click **Launch Admin** on the Demo Administrator card.
- Alternatively, sign in via the standard login page using `admin@demo.merydian.com` / `demo123`.

## Adding a New Persona

1. Update the `PERSONAS` dictionary in `backend/scripts/generate_demo_data.py`.
2. Run `python scripts/generate_demo_data.py` to create the new JSON fixture.
3. Add the persona to the `DEMO_PERSONAS` array in `frontend V2/src/pages/DemoLauncherPage.tsx` with an appropriate icon and description.
4. Run `python scripts/provision_demo_database.py --reset` to generate the relational data.
