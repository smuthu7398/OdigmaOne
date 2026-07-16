# Odigma One — API Conventions

All REST endpoints live under `/api/v1/…` (Next.js Route Handlers in
`web/src/app/api/v1/`). Web and Mobile consume the same endpoints.
Request/response shapes are defined once as Zod schemas in
`shared/` (`@odigma/shared`) and used for both validation and typing.

## Response envelope

Every endpoint returns exactly one of:

```json
// success
{ "success": true, "data": …, "meta": { "page": 1, "pageSize": 20, "total": 92, "totalPages": 5 } }

// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Title is required", "details": … } }
```

`meta` appears only on paginated list responses.

## Error codes & HTTP status

| HTTP | code | when |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod parse failed (details = flattened field errors) |
| 401 | `UNAUTHORIZED` | no/invalid session |
| 403 | `FORBIDDEN` | lacks permission or row-scope (client sees only own rows) |
| 404 | `NOT_FOUND` | missing or soft-deleted resource |
| 409 | `CONFLICT` | duplicate / state conflict |
| 500 | `INTERNAL` | unexpected — never leak internals in `message` |

## Rules

- **Auth**: session via Better Auth (`/api/auth/*`). Every `/api/v1`
  handler resolves the session first; unauthenticated → 401.
- **RBAC**: check permission keys (`task:update`), never role names.
  Client-role requests are additionally row-scoped by `clientId`.
- **Pagination**: `?page=1&pageSize=20` (max 100), `sort=-createdAt`
  (leading `-` = desc), `q=` for search. Defaults in
  `paginationQuerySchema`.
- **Soft delete**: DELETE sets `deletedAt`; all list/detail queries
  filter `deletedAt: null`.
- **Dates**: store UTC; API always returns ISO-8601 UTC strings; UI
  renders in the user's timezone (default `Asia/Kolkata`). WorkLog
  `workDate` is a plain date in the user's timezone.
- **Activity log**: every create/update/delete on domain entities writes
  an `Activity` row (entityType, entityId, action, meta diff).
- **IDs**: cuid strings. Tasks additionally expose `number`
  (auto-increment) rendered as `ODG-<number>`.
- **Uploads**: `multipart/form-data` to `/api/v1/files`; served back
  only through an authenticated route, never as public static files.
