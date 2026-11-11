# Modes

| | Free play | Rules |
|---|---|---|
| Checks moves | No | Yes, against the card's map |
| Flip | Swipe anywhere | Tap a flip spot, or swipe when unambiguous |
| Rotate | Arrows, always | Arrows, only with a spin to use |
| Shows spots | No | Usable spots glow |
| Motion control | No | Optional, on phones |
| Restart button | Hidden | Shown |
| Win | No | Tapping the open exit |

## Switching

- The top-right HUD circle (footprints) switches modes inside a level; it is inked in while rules are on.
- Switching never reloads the page.
- **To rules**: the card restarts at its own start (or asks the player to pick one, if it has several).
- **To free play**: the card stays exactly as it lies; Motion is turned off.
- Cards without a playable map have no switch and show "Rules are not available for this card yet." when opened with rules.

## HUD

A row of ink circles in the top gutter, each a glyph with an `aria-label`, in fixed slots so none moves when another hides. Left: **back** (to the level picker), then the items tally (`✓ n/m`, cards with items only). Right, inward from the edge: **mode**, **restart** (rules only), **motion** (phones, rules only).

The status message is not drawn: it is a screen-reader live region. Only messages a picture cannot say (phone settings, no rules for this card, the unreviewed map) also appear in a speech balloon at the bottom for 3s.

**Unreviewed map**: in rules mode, a card whose map is not reviewed shows a "?" tag in the panel's top-right corner; tapping it says "Unreviewed map: the rules may be wrong." Free play hides it, since it does not use the map.
