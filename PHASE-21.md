# Phase 21 — recovery-file safety

Improved checkpoint loading to reject duplicate table codes, reused host/player recovery tokens, malformed player entries and unreasonable restored chip balances. This prevents a corrupted or manually edited snapshot from silently overwriting another table or duplicating access credentials.

Added five automated recovery regression checks. Live Socket.IO tests remain unverified without runtime dependencies. No GitHub or Render deployment has been performed.
