# One Card Maze — spec

What the app does and how players interact with it. Each file covers one area:

- [levels.md](levels.md): level picker, URLs, offline
- [modes.md](modes.md): free play and rules, and switching between them
- [controls.md](controls.md): every input, per mode
- [rules.md](rules.md): what rules mode enforces, and its messages
- [motion.md](motion.md): motion control and the north arrow

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Level picker: every card, plus the default play mode |
| `play.html?card=<name>[&mode=guided]` | One card, played in free play or with rules |

## Terms

- **Card**: a two-sided maze picture (`cards/<name>/front.png`, `back.png`).
- **Map**: the card's graph of spots and paths (`cards/<name>/maze.json`), used only by rules mode. Format: [tools/README.md](../../tools/README.md).
- **Spot**: a node on the map: start, exit, room, door, spin, flip, item, portal.
- **Reviewed**: a map someone has checked against the picture (`"status": "reviewed"`); the rest are drafts.
