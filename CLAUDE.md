# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal homepage for Jakub Dębski (ilmenit). Single-page static site published to GitHub Pages. No build step, no package manager, no frameworks. Vanilla HTML/CSS/JS, hand-written to stay small and ageable.

## Serving locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. There is no build, lint, or test pipeline — open `index.html` directly or via a static server. If changes affect the hero canvases, confirm them in a real browser (the three effects are canvas animations and cannot be verified from the terminal alone).

## Layout

```
index.html              # markup only; no inline CSS or JS of substance
assets/
  css/
    tokens.css          # CSS custom properties + dark-mode overrides
    base.css            # reset, typography, .reveal, page grain
    layout.css          # page shell, topbar, sections, timeline, footer
    components.css      # hero, cards, awards, sc-grid, tools, hobbies, links, coffee
  js/
    main.js             # scroll progress, IntersectionObserver reveal, raster rule
    hero/
      mona.js           # MonaEffect (exposes window.MonaEffect)
      encounter.js      # EncounterEffect (window.EncounterEffect)
      urban-drift.js    # UrbanDriftEffect (window.UrbanDriftEffect)
      rotator.js        # cycles the three effects inside #hero-frame
index.md                # markdown mirror of the page content (source notes)
*.txt                   # raw content notes (demoscene, games, retro-computing, etc.)
CV - Jakub Debski.odt   # source for the "Work" section
```

## Hero effect rotator (the unusual part)

The hero area runs three of Jakub's own demoscene intros in rotation, reimplemented in JavaScript:

- **Mona** (`mona.js`) — faithful port of the 250/256-byte Atari XL/XE intro. 64 brush strokes driven by a 32-bit Galois LFSR (polynomial `$04C11DB7`, initial seed `$7EC8`, 64 per-stroke word seeds from the original production). Each stroke has length `(64 - i) * 32`. The LFSR's bit 1 picks axis (x/y), bit 7 picks direction (+/-). Drawing surface is 128×128 masked via `& 0x7F`. Do not touch the seed table or the LFSR tap without checking against the original `.asm` — the image is encoded entirely in those constants.
- **Encounter** (`encounter.js`) — adapted from `ilmenit/sizecoding/Encounter`, no controls, fixed settings. CPU raytracer for ocean waves, iterative sine-based height field, vignette + blob + film grain.
- **Urban Drift** (`urban-drift.js`) — adapted from `ilmenit/sizecoding/urban_drift`, no controls. SDF raymarched cityscape with Bayer-dithered temporal sampling (1/16 pixels per frame) to stay interactive.

Each effect class exposes `constructor(canvas)`, `start()`, `stop()`. `rotator.js` creates one canvas per stage inside `#hero-frame`, starts the active effect, stops the previous one, and crossfades via the `.active` class. It pauses on `document.hidden` and honors `prefers-reduced-motion` (shows only Mona, no rotation).

Adding a stage: implement a class with the same surface, register it in `STAGES` in `rotator.js`, and make sure the script is loaded before `rotator.js` in `index.html`.

## Sizecoding gallery

The `#sizecoding` section renders a grid of productions. Thumbnails are hot-linked from `raw.githubusercontent.com/ilmenit/sizecoding/main/...`. The `rescue_on_mars!` folder name contains `!` and must be URL-encoded as `%21` in image `src` attributes (anchor `href` can use the literal `!`, GitHub redirects it).

## Writing style (important)

Prose on this site must not read AI-generated. Rules, per the user's standing feedback:

- No em dashes. No emoji. No "it's not just X, it's Y" constructions.
- No self-congratulatory framing. Lead with what readers/players might enjoy or the technical challenge, not "I'm proud of".
- Understated, slightly British-leaning register. Facts over adjectives (exact year, platform, size in bytes beats "amazing").

Audit any prose you write for these patterns before handing it back.

## Deployment

GitHub Pages serves the repository as-is from the root. Any change to files under the repo root or `assets/` is live after push. Keep paths relative (no leading `/`) so it works both at a user/project Pages URL and locally.
