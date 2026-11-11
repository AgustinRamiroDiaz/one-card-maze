# Controls

The rotate arrows sit beside the card on wide screens and under it on phones (≤600px).

## Free play

| Input | Effect |
|---|---|
| Swipe or mouse-drag on the card (≥50px) | Flips the card over, rolling in the swipe's direction |
| ↻ / ↺ arrows | Turn the card a quarter clockwise / counterclockwise |

## Rules

| Input | Effect |
|---|---|
| Tap a glowing start | Starts there (cards with several starts only) |
| Tap a glowing spin | Walks there; the player now stands on it (green ring) |
| Tap a glowing flip | Walks there and flips the card over that edge |
| Tap a glowing portal | Walks in; then tap the portal to come out of (or the same one to step back out) |
| Tap the glowing exit | Wins (confetti) |
| ↻ / ↺ arrows | Turn the card a quarter. Enabled when the player stands on a spin, or exactly one spin is in reach (the player is walked onto it first). Greyed out otherwise |
| Swipe on the card | Uses the one flip in reach on the edge **opposite** the swipe, like scrolling: swipe up to go out the bottom. The card rolls in the swipe's direction. With none or several, a toast explains and nothing moves |
| Turn the phone (Motion on) | See [motion.md](motion.md) |
| **Restart** | Back to the card's start, unrotated, items dropped |

Input is ignored while the card animates (1s).

## Both modes

- **← Levels** returns to the level picker.
- Pinch-zoom works on the card; one-finger drags on it never scroll the page.
- Under `prefers-reduced-motion`, spots stop pulsing and there is no confetti.
