# Content Machine — Design Only Organized Build

This package is intentionally frontend/static only.

- No backend workflows.
- No auth integration.
- No payment integration.
- No Claude / Higgsfield / database wiring.
- `/api/health` exists only for Railway healthchecks.

Main route: `public/index.html`.
Navigation uses hash routes such as `#/dashboard`, `#/market-hub`, `#/market`, `#/ugc-avatar`.
The 404 screen is rendered only for unknown routes, not as a permanent demo tab.
