# Project Structure

```
frontend/
├── app/                  # Next.js App Router (Orchestration only)
│   ├── agent-dashboard/  # Agent flow orchestration
│   ├── customer-dashboard/# Customer flow orchestration
│   ├── demo/             # Demo entry point
│   └── layout.tsx        # Global layout & providers
├── components/           # Shared, generic UI components
│   └── ui/               # Design primitives (Button, EmptyState, etc.)
├── features/             # Domain-driven feature modules
│   ├── analytics/
│   ├── authentication/
│   ├── demo/
│   ├── diff/
│   ├── explanations/
│   ├── feedback/
│   ├── jobs/
│   ├── optimization/
│   ├── timeline/
│   └── trips/
├── lib/                  # Global utilities and store
│   ├── query-client.ts
│   ├── store.ts
│   └── utils.ts
├── services/             # API communication layer
│   ├── auth.ts
│   ├── client.ts
│   ├── demo.ts
│   ├── explanations.ts
│   ├── feedback.ts
│   ├── itinerary.ts
│   └── trips.ts
└── types/                # Global types
    └── dto.ts            # DTOs mirrored from backend
```

## Anatomy of a Feature
Each directory inside `features/` follows this standard pattern:
- `components/`: UI specific to this feature.
- `hooks/`: React Query hooks and logic abstraction.
- `services/`: Feature-specific API clients (if not in global `services/`).
- `types/`: Feature-specific type definitions.
- `utils/`: Helpers restricted to this feature's domain.
