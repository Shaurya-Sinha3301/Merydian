# Frontend Architecture Guide

## Overview
The frontend architecture has been migrated to a domain-driven, feature-centric approach. We have decoupled business logic from Next.js route orchestration to improve maintainability, testability, and state consistency.

## Core Architectural Layers
1. **Routing & Orchestration (`app/`)**: Next.js App Router serves purely as an orchestrator. Pages import feature components and wire them together. No business logic or API calls occur directly in `page.tsx`.
2. **Domain Features (`features/`)**: The core of the application. Organized by domain (e.g. `trips`, `timeline`, `feedback`).
3. **Global State (`lib/store.ts`)**: Zustand manages transient UI state (e.g., active trip ID, open modals) that spans across multiple domains.
4. **Server State (`lib/query-client.ts`)**: TanStack React Query handles server data fetching, caching, synchronization, and polling.
5. **API Services (`services/`)**: Abstraction layer for HTTP requests, providing strongly typed methods utilizing the backend OpenAPI spec.
6. **Data Transfer Objects (`types/dto.ts`)**: The source of truth for all API responses and requests.

## Data Flow
`Component → React Query Hook → API Service → client.ts → HTTP → Backend`
