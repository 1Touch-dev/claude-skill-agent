# Live Browser Test Screenshots

Screenshots were captured during the **Cursor Browser** walkthrough on **2026-06-03** against:

- **UI:** http://54.167.31.169:3001  
- **API:** http://54.167.31.169:3000  

## Files captured in-session

| File | Page |
|------|------|
| `01-login-page.png` | Login (branding + sign-in) |
| `02-dashboard-admin.png` | Dashboard (live metrics) |
| `03-skills-search.png` | Skills (search filter) |
| `04-approvals-after-approve.png` | Approvals (post-approve) |
| `05-packages.png` | Packages table |

Additional screenshots were saved by the Cursor Browser tool to the local Cursor screenshots cache during the same session (full-page captures on login, dashboard, skills, approvals, packages).

## How to reproduce

1. Open http://54.167.31.169:3001/login  
2. Sign in with `ADMIN_TOKEN` (default `changeme`)  
3. Walk each nav item and use DevTools → Network to verify `/api/*` calls return **200**.
