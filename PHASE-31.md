# Phase 31 — Showdown presentation (first tranche)

## Changes
- TV reveal stage with paced card presentation (1.5 seconds per player), gold winner-seat emphasis, skip control, and reduced-motion instant reveal.
- Main and side pot results recorded during contribution-tier settlement, then presented separately on the TV.
- Uncontested hands remain private; only non-folded contenders appear in contested showdown data.
- New source-level tests for reveal UI, pot summaries and privacy guard.

## Known limitations
- Showdown pacing is client-side; it is not a synchronised server-controlled timeline across multiple TV displays.
- Winning five-card highlight, reveal order by last aggressor, individual pot animations, phone haptics, and audio polish remain outstanding.
- Runtime Socket.IO integration tests are skipped without installed dependencies. This phase is not production certified.
- The existing Tailwind CDN and external QR generator have not yet been removed.
