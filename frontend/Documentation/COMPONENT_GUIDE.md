# Component Guide

## Philosophy
We use a component-first design approach based on the Shadcn/Blueprint hybrid methodology. Components are separated into generic primitives and domain-specific smart components.

## Primitive UI Components (`components/ui/`)
Primitives are stateless and highly reusable.
- **`EmptyState.tsx`**: Used when a list is empty or data is missing.
- **`ErrorState.tsx`**: Renders localized error boundaries and API failure messages.
- **`LoadingState.tsx` / `LoadingSkeleton.tsx`**: Standardized loading spinners and pulse animations.
- **`OfflineState.tsx`**: Displays when the user loses network connectivity.

## Feature Components (`features/*/components/`)
These components encapsulate domain-specific styling and layout but remain decoupled from data fetching (fetching occurs via custom hooks passed as props or orchestrated by the parent).

### Example: Timeline Activity (`features/timeline/components/TimelineActivity.tsx`)
A polymorphic component that renders a hotel block, transport block, or general activity block based on the `TimelineActivityDTO.category`.

### Example: Optimization Progress (`features/optimization/components/OptimizationProgress.tsx`)
A rich, step-by-step visualizer that maps `JobDTO.current_stage` to a sequential UI, eliminating the use of simple loading spinners for complex asynchronous backend tasks.
