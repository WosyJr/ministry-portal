# Ministry of Civil and Administrative Affairs — Portal

The working hall of the Provincial Ministry of Civil and Administrative Affairs (Keizaal Online).

- **Public pages** — The Hall and the Notice Board. Anyone can read them.
- **Staff pages** — Clerk Desk, Writs & Forms, office pages, Docket, Archives search and Manuals. Staff sign in with a username and password issued by the Minister.
- **Filing** — a filled form is written as a Skyrim-styled Google Doc, numbered (Petition I, II, III…), placed in the right Drive folder, and entered in a live Docket sheet.
- **Minister's Study** — enter officers on the rolls, reset passwords, suspend or remove them, and connect the Google archives.

## Deploying on Railway

1. **New Project → Deploy from GitHub repo** and pick this repository.
2. **Add a volume** to the service, mounted at `/data`. It holds the officer accounts, the Google connection and the Docket sheet id, so nothing is lost on redeploy.
3. **Generate a domain** under Settings → Networking, then set the variables below.

| Variable | Value |
|---|---|
| `BASE_URL` | Your Railway domain, e.g. `https://ministry.up.railway.app` |
| `SESSION_SECRET` | Any long random string |
| `DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |
| `ADMIN_USERNAME` | Username for the first Minister account, e.g. `nimmi` |
| `ADMIN_PASSWORD` | Password for that account (10+ characters). Used only when no accounts exist yet |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From your Google Cloud OAuth client |

Optional: `MINISTER_NAME`, `CURRENT_YEAR` (default 226), and `FOLDER_*` to point at different Drive folders.

## Officer accounts

The first Minister account is created from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on first start. After that, add officers in **Minister's Study → Enter a New Officer**. Each gets a temporary password shown once, and must choose their own at first entry. Forgotten passwords are reset from the same page.

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
ADMIN_USERNAME=nimmi ADMIN_PASSWORD=choose-a-long-password npm start
```
