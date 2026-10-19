-- THE MORNING QUESTION - one row per phone that asked for it (worker/push.js).
-- Lives in its own EU database (qpio-push-uat-eu for UAT, qpio-push-eu for
-- production), created with --jurisdiction=eu. Nothing here is linked to the
-- anonymous counting or to any answer. A row is deleted when the reader turns the
-- reminder off, deletes their data, or the push service says the phone is gone.
--
--   npx wrangler@4.120.1 d1 execute <database> --remote --file worker/push-schema.sql [-c wrangler.prod.jsonc]
CREATE TABLE IF NOT EXISTS push_sub (
  id        TEXT PRIMARY KEY,           -- SHA-256 of the endpoint
  endpoint  TEXT NOT NULL,              -- the push address the phone's push service issued
  tz        TEXT NOT NULL,              -- IANA zone, checked with Intl
  hour      INTEGER NOT NULL DEFAULT 8, -- the reader's chosen hour, local
  next_utc  INTEGER NOT NULL,           -- epoch seconds of the next send
  created   INTEGER NOT NULL,           -- the day only (epoch seconds at 00:00 UTC)
  last_sent INTEGER,                    -- epoch seconds of the last accepted send
  fails     INTEGER NOT NULL DEFAULT 0  -- refusals in a row; forgotten at 5
);
CREATE INDEX IF NOT EXISTS push_due ON push_sub(next_utc);
