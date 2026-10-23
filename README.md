# The Gilded Deck

A **play-chip-only** multiplayer casino games night for a shared TV and private phone controllers. Built with Node.js 20+, Express, Socket.IO and pokersolver.

## Playable games

- Texas Hold’em — community-card poker.
- Omaha — exactly two hole cards and three community cards.
- Five-Card Draw — exchange up to three cards, maximum six players.
- Blackjack — dealer stands on 17; fixed 20-chip stake in the current build.
- British Three-Card Brag — prial, running flush, run, flush, pair, high card.

## Getting started

1. Install Node.js 20 or newer.
2. Run `npm install` then `npm test`.
3. Run `npm start` and open `http://localhost:3000` on the TV or host browser.
4. Create a room and share the room code or joining address.
5. Each player joins from their phone and selects an avatar. The host starts the game.

## Controls and recovery

The TV is a spectator screen; cards and actions are private to each player's phone. Players have a recoverable seat token kept on their own device. Disconnected players retain their seat for up to 60 seconds. An active disconnected player has their action timer suspended; on resuming, a fresh 30-second turn begins. After grace expiry the server folds or stands as appropriate. Five-Card Draw exchanges also time out to stand pat.

## Hosting on Render

The repository includes `render.yaml`. Use a single instance. Set `GILDED_STATE_FILE` to a writable persistent path if you want optional between-restart table recovery; an ephemeral free-tier filesystem does not provide durable recovery. Render supplies `PORT`. Avoid redeploying during a live games night.

## Architecture and privacy

- Server-authoritative shuffling, actions and chip settlement.
- Public `update-tv` state contains no resume token or unrevealed opponent cards.
- `update-player` carries only the owning player's private hand.
- Play chips only; **never use real money**.

## Verification and known limits

Run `npm test` and `node --check server.js`. Live Socket.IO tests require installed dependencies. Do not treat skipped integration tests as a release sign-off. This version still lacks configurable clocks, a full cinematic showdown, rebuys, Blackjack split and robust host transfer. The turn timer and reconnection interaction require live multi-device acceptance testing. Client still uses external CDN and QR resources.

## Documentation

- `README.md` — current setup, features and limitations.
- `DEVELOPMENT-HISTORY.md` — consolidated historical phase notes.
- `PHASE-27-CONSOLIDATION.md` — changes in this release.

## Phase 28 — Cash-game rebuys

When your play-chip stack reaches zero, the phone displays **Rebuy 1,000 play chips** between hands. Each rebuy increases your total bought-in chips and the visible rebuy tally. Rebuys are not available during a hand. These are play chips only; no payments are involved. Tournament rebuy restrictions are not yet implemented.

## Phase 29 — Between-hand table flow

After a completed hand, a 10-second server-controlled countdown starts if enough connected, funded players are available. Any seated player can press **Deal now** to skip the wait. The host can pause or resume the automatic dealing sequence. Each player can choose **Sit out next hand** and **I'm back next hand** without surrendering their seat or chips. A disconnected or underfunded player is not counted towards the next deal. Blackjack requires one eligible seat; the other games require two.

**Limitations:** The host is still a single point of failure for settings and pause controls; automatic host transfer is not implemented. Timer and socket integration tests must run with installed dependencies before production deployment.

## Phase 30 host recovery
If the TV host disconnects, after 30 seconds the longest-seated connected player temporarily gains host controls. The original host can reclaim using the saved host session token. Keep the host browser session data intact.

## Phase 31
The TV presents a paced showdown after contested hands, with hand descriptions, winning seat emphasis, and main/side pot awards. The host or viewer may skip the animation. For reduced-motion preferences the reveal is immediate. See `PHASE-31.md` for limitations.
