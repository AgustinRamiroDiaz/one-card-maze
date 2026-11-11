# Levels

## Level picker (`index.html`)

- A grid of every card's front; tapping one opens it in `play.html`.
- A **Free play / Guided (rules)** switch at the top sets the mode the levels open in. It is remembered in the browser (`localStorage`).
- A hint under the switch explains the chosen mode.
- In Guided mode, cards without a playable map (no start or no exit, or `"status": "unplayable"`) are faded; they open in free play.

## URLs

| URL | Opens |
|---|---|
| `play.html?card=<name>` | the card in free play |
| `play.html?card=<name>&mode=guided` | the card with rules enforced |

Switching modes inside a level updates `mode` in the address bar without reloading, so a refresh or a shared link keeps the mode. A missing `card` opens `MAZERULES`.

## Offline

A service worker caches every page and card image once it has been loaded. Online, it always fetches the latest files first; offline, it serves the cached copy. Nothing is precached.
