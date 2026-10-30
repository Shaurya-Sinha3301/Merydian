# Demo System Guide

## Overview
The demo mode allows evaluators and stakeholders to quickly instantiate realistic test data and experience the optimization workflow without manually inputting constraints.

## Architecture
- **Frontend Route**: `/demo`
- **Backend Endpoint**: `POST /api/v1/demo/load/{persona}`
- **Data Initialization**: When a persona is selected (e.g., `family_vacation`), the backend bypasses standard data entry and immediately creates a Customer, an active Trip, and an initial Itinerary.

## Demo Personas
1. **Family Vacation**: Demonstrates constraint handling for children (pacing, connected rooms).
2. **Luxury Couple**: Demonstrates high-budget prioritization and exclusive routing.
3. **Budget Backpacker**: Demonstrates aggressive cost optimization.
4. **Elderly Travelers**: Demonstrates mobility constraint processing (no stairs, slow pace).
5. **Accessibility Trip**: Demonstrates wheelchair accessibility strict constraints.

## Workflow
1. Navigate to `/demo`.
2. Click a persona.
3. The frontend triggers `POST /api/v1/demo/load/{persona}`.
4. The backend returns a JWT token for the mocked customer.
5. The frontend stores the token and redirects to `/customer-dashboard`.
6. From there, the demo user can submit feedback and watch the `OptimizationProgress` UI run in real-time.
