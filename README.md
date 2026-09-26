# Ministry of Civil and Administrative Affairs — Portal

The working hall of the Provincial Ministry of Civil and Administrative Affairs (Keizaal Online).

## Public side

- **The Hall** and **Notice Board** — proclamations posted by the Ministry, each with a printable proclamation page.
- **Petition Box** — anyone may submit a petition. It is numbered (Petition I, II…), written as a Google Doc in *Petitions & Civil Matters*, and entered on the Docket as *Received*.
- **Petition status** — enter a petition number and see only its state: Received, Under Review, Referred or Closed.
- **Directory** — the offices of the Ministry, who holds them, and the Delegate for each Hold.
- **Register of Licenses** — every License of the Ministry currently in force.
- **Ledger of Laws** — the codes the Ministry works under in plain words, plus any Standing Directive the Minister posts publicly.

## Staff side

Every officer holds a **rank**. Each rank sees only the tabs and powers the Minister ticks for it in **Minister’s Study → Ranks & Access**. Rank names can be changed and new ranks created there.

Default ranks follow the Ministry chart: Minister, Private Secretary, Chief of Civil & Administrative Affairs, Imperial Envoy to the Holds of Skyrim, Imperial Adjudicator, the four Imperial Delegates, Civil Clerk, Imperial Registrar, Registry Secretary and Administrative Clerk. Also: Governor, Vice Governor, Minister of the Interior, Minister of Justice, Minister of Finance and the Imperial War Office.

- **My Desk** — records assigned to you, writs returned to you, your drafts, handover notes and the Bulletin.
- **Writs** — fill in a writ; it is sealed and filed as a Google Doc, or sent to the **Approval Queue** if the rank may not seal its own. A checklist must be ticked before sealing. **Keep as draft** and **Practice** (preview without filing) are on every writ.
- **Records** — read any document inside the site, save it as a picture, print it, set its state, assign it, set its Hold, link it to other records, post it publicly, amend it, catalogue it for the Archives, or strike it from the rolls.
- **Petitions, Holds (with map), Archives, Ministry Requests, Bulletin, Handover, Training (handbook quiz), Reports (weekly report and activity log).**
- Other ministries use **Request Records**; each request is logged as Correspondence and answered by the Registry. Released records can then be read by the requester.

No one but the Minister needs access to the Google Drive. Officers read documents through the site.

## Seals

Writs sealed by an officer carry the Ministry’s wax seal. The Minister may upload a personal seal in **Minister’s Study → Seal, Calendar & Laws**; it is set on every writ the Minister seals or approves. Officers may set a signet (letters or a picture) in their **Profile**; it appears beside their name on writs they enter.

## Deploying on Railway

1. **New Project → Deploy from GitHub repo** and pick this repository.
2. **Add a volume** to the service, mounted at `/data`. It holds the officer accounts, ranks, drafts, notes, the activity log, seals and the Google connection.
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

## Google connection

1. <https://console.cloud.google.com> → create a project.
2. **APIs & Services → Library** → enable **Google Drive API** and **Google Sheets API**.
3. **OAuth consent screen** → External, add yourself as a test user (or publish the app so the connection does not expire after 7 days).
4. **Credentials → Create credentials → OAuth client ID** → Web application → Authorized redirect URI `BASE_URL/oauth/google/callback`.
5. Put the client ID and secret into Railway, sign in as the Minister, open **Minister’s Study → Seal, Calendar & Laws → Connect Google**, and approve with the Google account that owns the Ministry Drive folder.

The first connection creates **Ministry Administrative Docket (Live)** in *Ledgers & Dockets*. New columns are added to an existing Docket automatically.

## Running locally

```
npm install
ADMIN_USERNAME=nimmi ADMIN_PASSWORD=choose-a-long-password npm start
```
