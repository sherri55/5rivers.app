# Improvements Implemented

This document summarizes the improvements made to the 5rivers.app codebase.

## 1. Security – JWT Authentication

### Backend
- **Login endpoint**: `POST /api/auth/login` – validates credentials and returns JWT
- **Auth middleware**: Upload endpoint (`/api/upload`) now requires valid JWT
- **GraphQL context**: User from JWT is passed into context for future auth checks
- **Credentials**: Read from env (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) or `ADMIN_PASSWORD_HASH` for production

### Frontend
- **Auth flow**: Login calls backend API, stores JWT in localStorage
- **Apollo Client**: Sends `Authorization: Bearer <token>` on all GraphQL requests
- **Image upload**: Sends auth token when uploading
- **Sign out**: New logout button in header

### Setup
Add to backend `.env`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme   # Change in production!
JWT_SECRET=your-secret-key   # Required in production
```

For production, use hashed password:
```bash
node -e "require('bcrypt').hash('your-password', 12).then(console.log)"
# Add result to ADMIN_PASSWORD_HASH
```

## 2. Shared Calculations Module

**File**: `5rivers.app.frontend/src/lib/calculations/jobCalculations.ts`

- Centralized `addHST`, `getCommission`, `getAmountAfterCommission`, `getDriverPay`, `formatCurrency`
- Single HST rate (13%) and formula
- Used by: Dashboard, Jobs, JobList, InvoiceModal

## 3. Shared Types

**File**: `5rivers.app.frontend/src/lib/types/job.ts`

- `Job`, `JobType`, `JobDriver`, `JobDispatcher`, `JobUnit`, `JobInvoice`
- Replaces scattered inline definitions in Jobs.tsx, JobList.tsx

## 4. ErrorBoundary

**File**: `5rivers.app.frontend/src/components/ErrorBoundary.tsx`

- Catches React render errors
- Shows user-friendly message and "Try again" button
- Wraps app in `main.tsx`

## 5. Backend Consolidation

- **Single server**: GraphQL + auth + upload on one Express app (port 4001)
- **Entry point**: `npm run dev` and `npm start` now use `index.express.ts`
- **CORS**: Uses `ALLOWED_ORIGINS` from env
- **Upload config**: `APP_URL` / `UPLOAD_BASE_URL` for generated file URLs
- **Express 5**: Uses `@as-integrations/express5` with Apollo

## 6. Frontend Config

- **Upload URL**: Defaults to `http://localhost:4001/api/upload` (same origin as GraphQL)
- **Auth endpoint**: `VITE_AUTH_LOGIN_ENDPOINT` added
- **`.env.example`**: Added for frontend

## 7. Removed/Cleaned

- **Hardcoded credentials**: No longer in frontend code
- **Mock upload fallback**: Removed; real upload required
- **Console.logs**: Removed from InvoiceModal (Jobs query vars, etc.)
- **body-parser**: Replaced with `express.json()`

## 8. Deferred (Not Implemented)

- Resolver split into domain modules
- Jobs page split into smaller components
- DataLoader for N+1 queries
- Full pagination for Jobs (still limit 1000)
- Centralized logging service
- PDF service `console.log` cleanup (pre-existing)

## Running the App

1. **Backend**:
   ```bash
   cd 5rivers.app.backend
   cp .env.example .env   # Edit ADMIN_PASSWORD, JWT_SECRET
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd 5rivers.app.frontend
   npm run dev
   ```

3. **First login**: Use `admin` / `changeme` (or values from `.env`)
