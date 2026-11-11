---
version: 1
slug: "play-html"
primary_target: "play.html"
related_targets: ["index.html"]
---

## Scope

`play.html` (one card, free play and rules) and `index.html` (level picker), treated as one surface: the picker is the page of panels, play is one panel grown full screen. Visitor mode: Experience. The card leads from the first viewport.

## Audience and job

Kids 7+ and grown-ups, alone or together, on tablets and phones. Pick a card, then spin, flip and walk it to the exit without reading instructions.

## Constraints

- Card art is fixed; the UI frames and overlays it, never repaints it.
- Words only where a glyph is ambiguous, one or two short ones at most; every glyph has an `aria-label`.
- Touch targets sized for kids' fingers. Static HTML/CSS/JS, offline via `sw.js`.
- Visible credit to the original author.

## Direction contract

THESIS: Each screen is one wordless comic panel. The card is the actor; the UI only draws what comics draw around an actor: the panel border, motion lines, a balloon, a burst. Refuses the casual-puzzle default (glossy buttons, star bars, sky gradients) and the instruction banner.

OWN-WORLD: Black brush ink (#161412) on white, wobbly hand-drawn strokes, halftone-dot gutter (#e9e6e1). Colour lives only in the card; one hot yellow (#ffd23f) is reserved for the spot you can use right now. Controls are ink-circle pictograms and tailed balloons. Spot states are drawn stages: locked is hatched, usable glows yellow, used gets a tick.

STORY: The player sees one card in one panel, sees the yellow spot, touches it, and the card answers with motion lines. They understand moves from the card's reaction, not from text. Winning is a starburst panel.

FIRST VIEWPORT: Phone portrait: a fixed row of three ink circles in the top gutter (back as a curled arrow left; mode and restart right; slots never move). Below, one white panel with a thick wobbly border fills the rest; the card sits centred at about 80% of panel height. Two spin balloons hang at the bottom, tails pointing at the card, shown only when a spin is usable. Artist credit tag pinned to the card corner. Tablet landscape: same panel, balloons move to the card's left and right.

FORM: Pantomime Strip (wordless comic panel), position 6 of 7 on the grounded list; seed: 0dbe511575686e14. Raises: colour quarantined in the card (Lexicon Plate); one hot colour for the actionable spot (Polish Film Poster); one surface, picked panel grows into play (Ebru Bath); fixed HUD slots (Split-flap Concourse); artist credit on each card (Memory Quilt); spot states as drawn stages (Glaze Shelf).

Signature interaction: tapping a picker panel grows it into the play panel (View Transitions API, instant fallback). Motion grammar: spin draws curved motion lines that fade as the card settles; flip is a smear plus a quick squash; a blocked move is a small shake with a scribble cloud; win is a starburst panel. Reduced motion keeps the end states and drops the travel.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

The card spinning inside its panel with hand-drawn motion lines, landing with the next yellow spot lit.

## Unresolved

- Hand-lettered face for the few words left (served from the project, not a hosted stylesheet).
- Hand-drawn SVG glyph set to author: back, mode (free vs rules), restart, spin left/right, motion, locked, tick, win burst.
- Whether the picker shows card names at all, or only the cards.
