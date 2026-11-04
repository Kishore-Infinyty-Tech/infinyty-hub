# Deploying Infinyty Hub

Three apps, three deployments. Do them in this order, because each one needs the address of the one before it.

| App | Folder | Host |
|---|---|---|
| CRM API (Django) | `crm-website/backend` | Render |
| CRM website (Next.js) | `crm-website/frontend` | Vercel |
| Portal (Next.js) | `portal` | Vercel |

The code is on GitHub. Never put passwords in the repo; type them into each host's settings page.

## 1. CRM API on Render
1. Render > New > Blueprint > pick the repo. It reads `render.yaml`.
2. Fill the three values it asks for:
   - `DATABASE_URL`: the CRM database string (same as `crm-website/backend/.env`).
   - `ALLOWED_HOSTS`: the Render address without https, e.g. `infinyty-crm-api.onrender.com`.
   - `APP_URL`: the CRM website address from step 2 (you can edit it afterwards).
3. Deploy. Note the address, e.g. `https://infinyty-crm-api.onrender.com`.

## 2. CRM website on Vercel
1. Vercel > Add New > Project > pick the repo. Root Directory: `crm-website/frontend`.
2. Environment variable: `BACKEND_URL` = the Render address from step 1 (no trailing slash).
3. Deploy. Note the address, e.g. `https://infinyty-crm.vercel.app`. Put it into Render's `APP_URL`.

## 3. Portal on Vercel
1. Add New > Project > same repo. Root Directory: `portal`.
2. Environment variables (same values as `portal/.env.local`, except the CRM address):
   - `DATABASE_URL`, `AUTH_SECRET`, `DEMO_MODE=0`
   - `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`, `B2_ENDPOINT`, `B2_REGION`
   - `NEXT_PUBLIC_CRM_URL` = the CRM website address from step 2
3. Deploy. This is the link you share with the team.

## Notes
- The portal database already has its tables, so nothing needs to be created. Do not run `db:setup` against it, because that wipes the data.
- `NEXT_PUBLIC_CRM_URL` and `BACKEND_URL` are baked in at build time. If you change one, redeploy that app.
- Render's free plan sleeps after inactivity, so the first CRM request after a quiet period takes about a minute.
- Free `*.vercel.app` addresses are different sites, so `COOKIE_SAMESITE=None` (already set in `render.yaml`) is what lets the CRM sign-in work inside the portal's embedded view. Browsers that block third-party cookies will still ask for sign-in; the "Open in new tab" button always works.
