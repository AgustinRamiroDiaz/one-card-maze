# Controls

The two spin balloons sit beside the card, tails pointing at it, and under it when the panel is 640px wide or less.

## Free play

| Input | Effect |
|---|---|
| Swipe or mouse-drag on the card (≥50px) | Flips the card over, rolling in the swipe's direction |
| ↻ / ↺ balloons (white) | Turn the card a quarter clockwise / counterclockwise |

## Rules

| Input | Effect |
|---|---|
| Tap a glowing start | Starts there (cards with several starts only) |
| Tap a glowing spin | Walks there; the player (the ink bean) now stands on it |
| Tap a glowing flip | Walks there and flips the card over that edge |
| Tap a glowing portal | Walks in; then tap the portal to come out of (or the same one to step back out) |
| Tap the glowing exit | Wins: a starburst with play again, next card (yellow) and all cards |
| ↻ / ↺ balloons (yellow) | Turn the card a quarter. Shown when the player stands on a spin, or exactly one spin is in reach (the player is walked onto it first). Hidden otherwise |
| Swipe on the card | Uses the one flip in reach on the edge **opposite** the swipe, like scrolling: swipe up to go out the bottom. The card rolls in the swipe's direction. With none or several, the card shudders and nothing moves |
| Turn the phone (Motion on) | See [motion.md](motion.md) |
| **Restart** | Back to the card's start, unrotated, items dropped |

Input is ignored while the card animates (1s).

## Both modes

- The **back** circle returns to the level picker.
- Pinch-zoom works on the card; one-finger drags on it never scroll the page.
- Under `prefers-reduced-motion`, spots stop pulsing and there are no motion lines, shudder or burst animation.
