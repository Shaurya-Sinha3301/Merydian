# Merydian Demo Persona Reference

## Overview

The Merydian Demo Environment comes with several pre-configured personas designed to showcase different capabilities of the platform. This document outlines the available personas, their configurations, and their intended use cases.

## Available Personas

### 1. Family Vacation (The Smiths)
- **ID**: `family_vacation`
- **Login Email**: `family_vacation@demo.merydian.com`
- **Focus**: Optimization involving children, strict budgets, and structured schedules.
- **Data Configuration**:
  - **Travelers**: 2 Adults, 2 Children
  - **Budget**: Moderate
  - **Constraints**: Need kid-friendly activities, early dinners.
- **Use Case**: Demonstrates how Merydian handles complex family constraints and generates detailed daily itineraries with POIs.

### 2. Luxury Couple (The Chengs)
- **ID**: `luxury_couple`
- **Login Email**: `luxury_couple@demo.merydian.com`
- **Focus**: High-end experiences, premium budget, flexibility.
- **Data Configuration**:
  - **Travelers**: 2 Adults
  - **Budget**: Premium / High
  - **Constraints**: Fine dining, 5-star hotels, exclusive tours.
- **Use Case**: Highlights premium travel agent interactions, VIP booking workflows, and less constrained optimization paths.

### 3. Business Traveler (Sarah J.)
- **ID**: `business_traveler`
- **Login Email**: `business_traveler@demo.merydian.com`
- **Focus**: Efficiency, strict timing, minimal disruption.
- **Data Configuration**:
  - **Travelers**: 1 Adult
  - **Budget**: Corporate (Moderate to High)
  - **Constraints**: Close to conference center, fast wifi, quick meals.
- **Use Case**: Shows rapid re-optimization when flights are delayed or meetings change at the last minute.

### 4. Demo Administrator (Agent)
- **ID**: `admin`
- **Login Email**: `admin@demo.merydian.com`
- **Focus**: Overseeing all active trips, approving agent jobs, monitoring system health.
- **Data Configuration**:
  - **Role**: `agent`
  - **Access**: Global view of all demo jobs and trips.
- **Use Case**: Used by the presenter to demonstrate the backend "Agent Dashboard", approve pending AI optimizations, and monitor the queue.

## Modifying Personas

To modify these personas, edit the `PERSONAS` dictionary in `backend/scripts/generate_demo_data.py`, and run `python backend/scripts/provision_demo_database.py --reset` to rebuild the demo environment. You must also update the frontend representations in `frontend V2/src/pages/DemoLauncherPage.tsx`.
