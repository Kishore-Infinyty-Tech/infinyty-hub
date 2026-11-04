# Infinyty Hub (internal portal)

Dev A track: shell, news feed, announcements, app launcher, Performance Tracker mock, embedded CRM.

| Folder | What it is |
| --- | --- |
| `portal/` | The portal. Next.js 16, React 19, Tailwind 4, same design tokens and components as the CRM. |
| `crm-website/` | A copy of the CRM project. Runs on port 3200 (website) and 8001 (API) and opens inside the portal. |
| `start.bat` / `stop.bat` | One-command setup and start, and stop. |

## Run (Windows)

Open a terminal in this folder and run:

```bash
.\start.bat
```

It installs Python and Node packages (and offers to install Python or Node with winget if they are missing), asks for the database address the first time,
creates the tables and demo data if the database is empty, starts the portal, the CRM website and the CRM API, and opens http://localhost:3100.
It never wipes an existing database. Run `.\stop.bat` to stop everything.

| Address | What |
| --- | --- |
| http://localhost:3100 | Infinyty Hub (portal) |
| http://localhost:3200 | CRM website (opens inside the portal) |
| http://127.0.0.1:8001 | CRM API |

## Settings files (shared privately, not in git)

The database address, the login secret and the photo-storage keys are in two files that are **not** stored in this repository. Ask the project owner for them and place them exactly here, before running `.\start.bat`:

| File | Put it in this folder | What it holds |
| --- | --- | --- |
| `.env.local` | `portal\` (next to `portal\package.json`) | portal database, login secret, photo storage (B2) |
| `.env` | `crm-websiteackend\` (next to `crm-websiteackend\manage.py`) | CRM database |

```text
internal tool  portal    .env.local        <- here
    package.json
  crm-website    backend      .env            <- here
      manage.py
  start.bat
```

If a file is missing, `start.bat` asks for the database address and creates it (the portal one from `portal\.env.example`). Photo storage stays off until the `B2_*` lines are filled in.
Never commit these two files. They are listed in `.gitignore`. To rebuild the demo data on purpose: `cd portal`, then `npm run db:setup`.

## Pages and sign-in

`/` public home, `/login`, then (signed in only) `/home` feed, `/apps`, `/apps/<id>`, `/profile`, `/approvals`, `/hr`.
Sign-in is email and password. Passwords are hashed (scrypt) in `portal.users`, and the session is a signed, HTTP-only cookie (`AUTH_SECRET`).
Every seeded person has the password in `DEMO_PASSWORD` (`portal/.env.local`, default `Infinyty@2026`), e.g. `aditi@infinity.demo` (HR Admin), `aayush@infinity.demo` (Manager), `alex@infinity.demo` (Employee).
`DEMO_MODE=1` shows the one-click demo sign-in buttons and the role switcher. For production set `DEMO_MODE=0`, remove `NEXT_PUBLIC_DEMO_PASSWORD`, set a new `AUTH_SECRET` and real passwords.
Dev B: use `currentUser()` from `portal/lib/auth.ts` in API routes to know who is asking, and `useSession()` in screens.

## Demo script

1. **Employee (Alex):** browse the feed, react and comment. Open App launcher: Performance, Leave and CRM open, Invoice and Payables show *Access required* with *Request access*.
2. **HR Admin:** same feed, plus Payroll, Assets and everything else. The *HR Moderation* page is Dev B's slot.
3. **Manager:** *Approvals* page is Dev B's slot. Performance shows any team member's timeline.
4. Use the top-right avatar menu to switch to any of the 10 people (Neha, Vikram, Kishore...).

## Contract with Dev B

All data lives in Postgres schema `portal`. Dev A reads and writes `apps`, `app_permissions`,
`access_requests`, `post_reactions`, `post_comments`. Dev B writes new rows into `posts`
(`status = 'pending'` then `'published'`), `achievements` (`status = 'pending'` then `'approved'`)
and `notifications`. The feed and Performance view poll or reload, so published posts and approved
milestones appear without code changes on Dev A's side. Wire shapes are in `portal/lib/types.ts`.
Dev B screens render inside the shell at `portal/app/(portal)/hr` and `portal/app/(portal)/approvals`,
and read the current person and role from `useSession()` in `portal/lib/session.tsx`.

## Notes

- Seed post photos come from loremflickr.com (free, no key). Real photos go to a private Backblaze B2 bucket (`B2_*` in `portal/.env.local`).
  Upload with `POST /api/upload` (multipart: `file`, `userId`; HR and managers only) or call `saveImage(buffer, contentType)` from `portal/lib/storage.ts` (Dev B's WhatsApp ingestion).
  Both return `/api/media/posts/...`: save that in `portal.posts.image_url`. `components/ImageUploader.tsx` is the drag-and-drop field for the HR form.
- `portal.users` is a mock org chart (manager links in `manager_id`).
