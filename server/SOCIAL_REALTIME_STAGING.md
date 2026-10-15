# Social realtime staging setup

Realtime is opt-in. Without `REDIS_URL` on the backend and
`VITE_SOCIAL_REALTIME_ENABLED=true` on the web Preview deployment, clients keep
using the existing REST polling fallback.

## Staging configuration

1. Create a staging Cloud Run service using this backend code and a staging DB.
2. Configure `REDIS_URL` on that service (`redis://...` or `rediss://...`). Do
   not put Redis credentials in Git or in a `VITE_` variable. Use a staging-only
   Redis instance; Memorystore also requires Cloud Run VPC egress to its private IP.
3. Set `VITE_SOCIAL_REALTIME_ENABLED=true` only in the Vercel Preview environment
   that points at the staging API. Leave it unset in Production until staging
   tests pass.
4. Apply the additive index in `migration_performance_indexes.sql` to staging.
5. Test concurrent likes, comments, replies, reactions, edits, deletes, blocked
   users, reconnects, and Redis outages. On reconnect, REST remains the source of
   truth and refreshes missed events.

The WebSocket uses a 60-second signed ticket issued by the API. Redis Pub/Sub
events are published only after database commits and are best-effort; PostgreSQL
remains authoritative. Do not enable this in production until Redis networking,
capacity, and staging behavior are verified.
