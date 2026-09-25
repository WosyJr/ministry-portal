# Ministry of Civil and Administrative Affairs — Portal

The working hall of the Provincial Ministry of Civil and Administrative Affairs (Keizaal Online).

- **Public pages** — The Hall and the Notice Board. Anyone can read them.
- **Staff pages** — Clerk Desk, Writs & Forms, office pages, Docket, Archives search and Manuals. Staff sign in with Discord.
- **Filing** — a filled form is written as a Skyrim-styled Google Doc, numbered (Petition I, II, III…), placed in the right Drive folder, and entered in a live Docket sheet.
- **Minister's Study** — connect the Google archives and see who may enter.

## Deploying on Railway

1. **New Project → Deploy from GitHub repo** and pick this repository.
2. **Add a volume** to the service, mounted at `/data` (keeps the Google connection and Docket sheet id across deploys).
3. **Generate a domain** under Settings → Networking, then set the variables below.

| Variable | Value |
|---|---|
| `BASE_URL` | Your Railway domain, e.g. `https://ministry.up.railway.app` |
| `SESSION_SECRET` | Any long random string |
| `DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | From your Discord application |
| `ADMIN_DISCORD_IDS` | Comma-separated Discord user IDs of the Minister(s) |
| `STAFF_DISCORD_IDS` | Comma-separated Discord user IDs of staff |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From your Google Cloud OAuth client |

Optional: `DISCORD_GUILD_ID` with `DISCORD_STAFF_ROLE_IDS` / `DISCORD_ADMIN_ROLE_IDS` to admit staff by Discord server role instead of listing IDs. `MINISTER_NAME`, `CURRENT_YEAR` (default 226), and `FOLDER_*` to point at different Drive folders.

## Discord application

1. <https://discord.com/developers/applications> → **New Application**.
2. **OAuth2 → Redirects** → add `BASE_URL/auth/discord/callback`.
3. Copy the Client ID and Client Secret into Railway.

## Google connection

1. <https://console.cloud.google.com> → create a project.
2. **APIs & Services → Library** → enable **Google Drive API** and **Google Sheets API**.
3. **OAuth consent screen** → External, add yourself as a test user (or publish the app so the connection does not expire after 7 days).
4. **Credentials → Create credentials → OAuth client ID** → Web application → Authorized redirect URI `BASE_URL/oauth/google/callback`.
5. Put the client ID and secret into Railway, sign in as the Minister, open **Minister's Study → Connect Google**, and approve with the Google account that owns the Ministry Drive folder.

The first connection creates **Ministry Administrative Docket (Live)** in *Ledgers & Dockets*.

## Running locally

```
npm install
DEV_LOGIN=1 npm start
```

`DEV_LOGIN=1` adds test sign-in buttons on the Staff Entrance page. It is ignored when `NODE_ENV=production`.
