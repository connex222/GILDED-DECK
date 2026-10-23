# Phase 32 — Showdown polish

- Add selected best-hand cards to **completed contested** showdown payloads; do not expose them during betting.
- Highlight winning cards at the TV, with reduced-motion styling.
- Add reveal sound cue and one-time outcome haptics for player phones where supported.
- Add three source-level regression checks.

## Limitations
- Best-card extraction depends on pokersolver card representation and requires live end-to-end verification.
- Reveal timing is still per-browser, not synchronised across TV displays.
- Full sound library, detailed side-pot animation, live Socket.IO integration, and production hardening remain outstanding.
