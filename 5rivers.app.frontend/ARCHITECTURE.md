# Frontend Architecture

This document describes the frontend architecture and best practices used in 5rivers.app.

## Folder Structure

```
src/
├── app/                    # (future) App shell, providers
├── features/               # Feature modules - domain-driven
│   ├── auth/               # Authentication
│   │   ├── context/        # AuthContext, AuthProvider
│   │   ├── components/     # LoginModal
│   │   └── index.ts        # Public API
│   └── jobs/               # Jobs feature
│       ├── api/            # GraphQL queries & mutations
│       ├── hooks/          # useJobs, useJobMutations
│       ├── types/          # Job types
│       ├── pages/          # JobsPage
│       └── index.ts
├── shared/                 # Shared utilities, hooks
│   └── index.ts
├── routes/                 # Route config with lazy loading
│   └── index.tsx
├── components/             # Shared components (Layout, modals, ui)
├── pages/                  # Page components (legacy, migrating to features)
├── hooks/                  # Global hooks
├── lib/                    # Infrastructure (apollo, config, utils)
└── main.tsx
```

## Key Patterns

### Feature-based structure
- Each feature owns its API, hooks, types, and pages
- Features expose a public API via `index.ts`
- Cross-feature imports use `@/features/<name>`

### Data hooks
- `useJobs()` - fetches jobs with optional filters
- `useJobMutations()` - update/delete job with toast feedback
- Encapsulate Apollo `useQuery`/`useMutation` in feature hooks

### Lazy loading
- Routes use `React.lazy()` for code splitting
- Each page loads in its own chunk
- `Suspense` with loading fallback wraps routes

### Error handling
- `ErrorBoundary` at app root and route level
- Catches render errors, shows user-friendly message

### Auth flow
- `AuthProvider` from `@/features/auth`
- `LoginModal` for unauthenticated users
- JWT stored in localStorage, sent via Apollo link

## Import Conventions

```ts
// Feature internal
import { GET_JOBS } from '../api'

// Cross-feature
import { useAuth } from '@/features/auth'
import { useJobs } from '@/features/jobs'

// Shared
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

// Lib
import { config } from '@/lib/config'
```

## Migration Status

- ✅ Auth feature
- ✅ Jobs feature (api, hooks, types)
- ✅ Lazy-loaded routes
- ✅ TanStack Query removed (Apollo only)
- 🔄 Other features (invoices, drivers, etc.) - use lib/graphql, can migrate incrementally
