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
| `AUDIT_KEY` | Any long random string, set to the **same value** on the ministry, penoc and bruma services. Lets **Administration → Every Hand** read the other two halls' logs. |
| (the same `AUDIT_KEY`) | Also lets PenOc read this site's warrants, inquisitions and Imperial Notices from `/justice/link.json`, so a person file on PenOc shows the Bench's paper on that name. |
| `PENOC_URL`, `BRUMA_URL` | Only if those sites move. Default to penoc-production.up.railway.app and countyofbruma.com. |
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

## Added lately

- Judgments, warrants and Imperial Notices draw as paper on their own record pages (`/justice/warrants/:id`, `/justice/notices/:id`, the judgment on a matter's page), with Save as picture; parchment stays parchment at night.
- **Make the pack** on a matter: every paper on it behind a cover sheet and contents (`/justice/cases/:id/pack`), to print or save as one PDF.
- My Desk is three lanes of cards — yours to do, waiting on others, falling due; pressing = older than three days or due within a day.
- The Gazette drafts itself from the day after the last issue: judgments, warrants and notices from the Bench join notices, sealed papers, appointments and licences. Inquisitions are never gathered.
- Parties get the line: everything the Bench has written that names them, in order, with gaps marked.
- `/justice/link.json` carries the Ministry's calendar and, per inquisition, the people it names; the printable papers also answer to `Authorization: Bearer AUDIT_KEY` so PenOc can show them to officers with no Ministry login.

## Payroll

Finance › Payroll lists every group with what it pays its people each week (added up from its roll) and the most it may pay. A Finance manager sets each group's max payroll a week, on that page or on the group's Rosters page, and the page shows how much is left or how far over the max a group is. Maxes are kept in `finance-caps.json`.

## Themes

Night mode defaults to Dusk. Anyone can choose another night scheme at `/themes` (linked from the top bar, the landing page and each officer's Profile). An officer's choice is saved with their account (`prefs.night`) and follows them to any device; a visitor's is kept in the browser. Each scheme is its own file in `public/night/`, loaded only when chosen.

## Read a Log (Staff Room)

`/province/staff/log` turns the Keizaal admin log into plain sentences. Three ways in:

- **Paste.** Select rows on Keizaal, copy, paste. Day headings ("Today 109") become day markers; JSON blocks attach to the row above them. Click a row on Keizaal first if you want its numbers included.
- **One click from Keizaal (Pulls).** `/province/staff/log/pulls` gives each officer a bookmark button carrying a key of their own. Drag it to the bookmarks bar; on the Keizaal admin logs page, click it. Clicking it opens a small panel on Keizaal: pull **what the page shows** (honouring its time range, search, player, Discord id and action type), or pull **one person** by character name (with Keizaal's own name suggestions) or Discord id over the last day, week or month. The Pulls page also has *Pull one person from here*, which opens Keizaal on that person; clicking the button there pulls them without asking. Either way it calls Keizaal's own log API from inside the signed-in tab, pages through up to 8,000 events, and posts them to `/province/staff/log/pull`. `KEIZAAL_URL` overrides the Keizaal address (default `https://keizaal.com`). The Ministry keeps the last forty pulls in `keizaal-pulls/` on the volume, each readable with exact timestamps and Discord ids. No Keizaal password or cookie ever reaches the Ministry; the key lets events in and nothing else, and *Remake my button* kills the old one. Times are shown in `KEIZAAL_TZ` (default `America/New_York`).
- **A screenshot.** "Or read a screenshot" runs text recognition on the server (`tesseract.js`, English data in `vendor/tessdata/`). Names and actions read well; small digits deserve a second look, and the page says how sure it was. First use after a deploy takes a few seconds longer while the reader warms up; it is let go after five idle minutes.

What comes out: one sentence per event for every action type Keizaal logs (chests, items, trades, combat, deaths, sessions, crafting, mining, chat, commands, rolls, houses, missives, admin actions), colour-coded by kind; chest changes as a ledger of what came out and what went in; repeats folded into one row with a count; filters by kind and person, a search box; and tabs for a tally by person and by chest (with a net line per chest). Items are named from the registry, and "What the numbers say" explains each field under the row.

New dependencies: `tesseract.js` and `jimp`. Railway installs them from `package.json`. The reader needs roughly 200 MB of memory while a screenshot is being read.
