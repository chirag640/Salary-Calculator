# API Route Migration to withAuth Middleware

This document outlines the migration strategy for converting existing API routes to use the `withAuth` middleware wrapper from `@/lib/api-middleware.ts`.

## Benefits of withAuth

1. **Standardized Authentication**: Single point of authentication handling
2. **Automatic CSRF Validation**: Built-in CSRF check for state-changing methods
3. **Rate Limiting**: Configurable rate limiting per route
4. **Error Handling**: Consistent error responses via `Errors` helper
5. **Logging**: Automatic request/response logging with timing
6. **Type Safety**: Typed `AuthUser` parameter

## Before (Manual Auth Pattern)

```typescript
import { getUserFromSession } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { rateLimit, buildRateLimitKey } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromSession(request);
    const userId = user?._id;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // CSRF check
    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const key = buildRateLimitKey(ip, "create-entry");
    const result = rateLimit(key, { windowMs: 60000, max: 30 });
    if (!result.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // ... route logic ...
  } catch (error) {
    logger.error("Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

## After (withAuth Pattern)

```typescript
import { withAuth, Errors, successResponse } from "@/lib/api-middleware";

export const POST = withAuth(
  async (request, user) => {
    // user is already authenticated and typed
    const userId = user._id;

    // ... route logic ...

    return successResponse(
      { data: result },
      { message: "Created successfully" },
    );
  },
  {
    requireCsrf: true, // default
    rateLimit: { windowMs: 60000, max: 30 },
  },
);
```

## Migration Status

### Candidates for Migration (Priority Order)

**High Priority** (state-changing routes with sensitive data):

- [ ] `/api/profile` - PUT
- [ ] `/api/profile/pin` - POST
- [ ] `/api/profile/increment` - POST
- [ ] `/api/time-entries` - POST, PUT, DELETE
- [ ] `/api/time-entries/[id]` - PUT, DELETE
- [ ] `/api/time-entries/[id]/timer` - POST

**Medium Priority** (authenticated data access):

- [ ] `/api/profile` - GET
- [ ] `/api/profile/hourly-rate` - GET
- [ ] `/api/profile/earnings-visibility` - GET, PUT
- [ ] `/api/time-entries` - GET
- [ ] `/api/time-entries/[id]` - GET
- [ ] `/api/export` - GET, POST
- [ ] `/api/export/payslip` - POST

**Low Priority** (admin/utility routes):

- [ ] `/api/admin/cleanup` - POST
- [ ] `/api/debug-test` - All methods

### Routes to Skip (Authentication handled differently)

These routes have custom auth flows and should NOT be migrated:

- `/api/auth/*` - Authentication endpoints (login, register, OTP, etc.)
- `/api/csrf` - CSRF token endpoint

## Notes

1. The `withAuth` middleware expects `context?.params` for dynamic routes like `[id]`
2. For GET requests, `requireCsrf: false` can be used to skip CSRF validation
3. Custom rate limit keys can be specified via `rateLimit.key` option
4. The middleware automatically logs request timing and errors
5. Use `successResponse()` and `Errors.*` for consistent responses

## Example Migration: time-entries POST

See `/app/api/time-entries/route.ts` for the full implementation.
