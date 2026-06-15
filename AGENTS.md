# Terra Chronicle Agent Instructions

Before making code or design changes in this repository, read `PROJECT_VISION.md` and align the work with the long-term product target.

## Product North Star

Terra Chronicle is not a generic browser game. Treat it as a high-aesthetic, high-performance interactive art game with deep systems:

- Frontend quality must be excellent: visual design, UI composition, animation transitions, art direction, lighting, and feel should look premium rather than generic or AI-flavored.
- Runtime must stay smooth. Every visual feature needs performance awareness and browser verification.
- Gameplay depth matters as much as presentation: farm management, spirit beast labor/progression, material-based card crafting, ecology, tech-tree divergence, seasonal defense, and geopolitical multiplayer should reinforce each other.
- Single-player and multiplayer must share one progression model. AI neighbors and real players should use the same policy/system interfaces.

## Required Workflow

1. Read `PROJECT_VISION.md` before planning substantial changes.
2. Preserve or improve public playability at `https://terra.bz9.me/`.
3. Verify in a real browser after rendering changes, especially after touching Pixi renderer, filters, canvas sizing, culling, transitions, or viewport logic.
4. If changing deployed static files, update both the Git source tree and the live Nginx-served tree when applicable:
   - Git/source: `/root/terra-chronicle-game`
   - Current public root: `/var/www/terra-pixijs`
5. Bump the `src/main.js?v=N` query in `index.html` after changing `src/main.js`, because Cloudflare/browser cache can keep old JS by query path.
6. Commit and push meaningful changes to GitHub so server loss does not erase progress.
7. For any new monster, card, pet, crop, or major UI set, first align it with `docs/unified-art-design-spec.md` before implementation.

## Rendering Pitfalls

- Do not reintroduce world-level Pixi `ColorMatrixFilter` or manual `world.filterArea` without proving it does not crop the translated/scaled world. This caused black terrain rectangles after entering the game.
- Be careful with tile/object viewport culling. Incorrect camera/world coordinate conversion can hide visible terrain and create black blocks. Prefer correctness and playability over premature culling until a verified culling system exists.
- Always test the actual public domain, not only localhost or a PM2 side copy.
