# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Kids from about 7 (early readers) and grown-ups, playing alone or together. Touch devices first: tablets and phones are equal priorities; desktop is secondary. Installable as a fullscreen PWA.

## Product Purpose

A fan companion for One Card Maze: every card in one place, a level picker in front of it, and a player that lets you turn, flip and walk each two-sided maze card, either freely or with the rules enforced. Success is a player who finds the exit without needing to read instructions.

## Positioning

The cards are the protagonist. The UI exists only to pick a card and to make handling it (spin, flip, walk, win) feel physical and clear. It never competes with the card art.

## Operating Context

- Pages: `index.html` (level picker, 124 cards) and `play.html?card=<name>[&mode=guided]` (one card).
- Two modes: free play (swipe to flip, arrows to rotate) and rules (usable spots glow, moves are checked, tapping the open exit wins). Full spec in `docs/spec/`.
- Optional motion control on phones (tilt to rotate).
- Works offline through `sw.js`.

## Capabilities and Constraints

- Plain static HTML/CSS/JS, no framework or build step.
- Card art is fixed: `cards/<name>/front.png` and `back.png` (~750×1050). The UI cannot alter it, only frame and overlay it.
- Some cards have no playable map yet; they fall back to free play.
- Card names are mostly numeric IDs (e.g. `25502893`), a few words (`BURGER`, `DRAGON`).

## Brand Commitments

- Fan project: keep visible credit to the original author (singingsimon / onecardmaze.com). No claim to be the official site.
- Binding direction from the user: the UI's style follows the cards (hand-drawn, cartoonish); minimalist; as few words as possible.

## Evidence on Hand

- 124 card folders under `cards/`, each with front, back, and `maze.json`.
- Existing images: `assets/images/logo.png`; table texture `assets/images/wood-seamless-pattern.jpg` (picker only). Glyphs for play.html are an inline SVG sprite; the hand-lettered face is Gochi Hand (OFL), self-hosted in `assets/fonts/`.
- Phone and desktop demo recordings in `demo/clips/`.

## Product Principles

1. The card is the hero; every UI element is smaller, quieter and fewer than what it serves.
2. Show, don't tell: actions and states are icons, gestures, glow and motion. Words only where an icon would be ambiguous, and then one or two short ones.
3. Physical handling: the card behaves like a real card on a table.
4. Credit the original author.

## Accessibility & Inclusion

- Early readers (~7+): no instruction may depend on reading a sentence.
- Touch targets sized for kids' fingers on phones and tablets.
- Icons still need accessible names (`aria-label`) for screen readers.
