# Phase 27 continuation — timer hardening and documentation consolidation

## Changes
- Paused active turn clocks when the player disconnects, allowing the 60-second recovery grace to operate without a competing 30-second auto-fold.
- On reconnection, the existing room broadcast starts a fresh 30-second clock.
- Added a per-player 30-second Five-Card Draw exchange timer; on expiry the player stands pat.
- Cancelled draw timers when a player disconnects or leaves the exchange phase.
- Consolidated historical PHASE-*.md and DESIGN-PHASE-2.md into DEVELOPMENT-HISTORY.md.
- Replaced obsolete starter README with current project documentation.

## Limitations
- This is a continuation of Phase 27, not a complete premium upgrade.
- The clocks use real timers and still need fake-clock and live multi-device testing.
- The two Socket.IO tests may be skipped without dependencies; do not deploy as production-ready without them.
- Not uploaded to GitHub or Render by this package build.
