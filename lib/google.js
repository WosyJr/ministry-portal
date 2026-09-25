const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { google } = require('googleapis');
const C = require('./config');

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];
const STATE_FILE = () => path.join(C.DATA_DIR, 'google.json');
const DOCKET_TAB = 'Docket';
const HEADERS = ['Record No', 'Class', 'Number', 'Date (4E)', 'Subject', 'Filed By', 'Folder', 'Document', 'Status', 'Public', 'Summary', 'Filed At (UTC)', 'Form'];

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); } catch (_) { return {}; }
}
function writeState(patch) {
  const next = { ...readState(), ...patch };
  fs.mkdirSync(C.DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE(), JSON.stringify(next, null, 2));
  return next;
}

function oauthClient() {
  return new google.auth.OAuth2(C.GOOGLE_CLIENT_ID, C.GOOGLE_CLIENT_SECRET, C.BASE_URL + '/oauth/google/callback');
}
function configured() { return !!(C.GOOGLE_CLIENT_ID && C.GOOGLE_CLIENT_SECRET); }
function refreshToken() { return C.GOOGLE_REFRESH_TOKEN || readState().refresh_token || ''; }
function connected() { return configured() && !!refreshToken(); }

function authUrl(state) {
  return oauthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES, state });
}
async function handleCallback(code) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  let email = '';
  try {
    const drive = google.drive({ version: 'v3', auth: client });
    const about = await drive.about.get({ fields: 'user(emailAddress)' });
    email = about.data.user.emailAddress;
  } catch (_) {}
  const patch = { connected_email: email, connected_at: new Date().toISOString() };
  if (tokens.refresh_token) patch.refresh_token = tokens.refresh_token;
  writeState(patch);
  return { email, refreshToken: tokens.refresh_token || '' };
}
function disconnect() { writeState({ refresh_token: '', connected_email: '' }); }
function status() { const s = readState(); return { configured: configured(), connected: connected(), email: s.connected_email || '', fromEnv: !!C.GOOGLE_REFRESH_TOKEN, docketId: docketId() }; }

function authed() {
  if (!connected()) throw new Error('The Ministry archives are not connected to Google yet. The Minister must connect them on the Admin page.');
  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken() });
  return client;
}
const drive = () => google.drive({ version: 'v3', auth: authed() });
const sheets = () => google.sheets({ version: 'v4', auth: authed() });

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function uploadAsGoogleDoc(buffer, name, folderId) {
  const res = await drive().files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.document', parents: [folderId] },
    media: { mimeType: DOCX, body: Readable.from(buffer) },
    fields: 'id, webViewLink, name'
  });
  return res.data;
}

function docketId() { return C.DOCKET_SHEET_ID || readState().docket_id || ''; }

async function ensureDocket() {
  let id = docketId();
  if (id) return id;
  const s = sheets();
  const created = await s.spreadsheets.create({
    requestBody: {
      properties: { title: 'Ministry Administrative Docket (Live)' },
      sheets: [{ properties: { title: DOCKET_TAB, gridProperties: { frozenRowCount: 1 } } }]
    },
    fields: 'spreadsheetId'
  });
  id = created.data.spreadsheetId;
  await s.spreadsheets.values.update({ spreadsheetId: id, range: DOCKET_TAB + '!A1', valueInputOption: 'RAW', requestBody: { values: [HEADERS] } });
  try {
    await drive().files.update({ fileId: id, addParents: C.FOLDERS.ledgers, removeParents: 'root', fields: 'id' });
  } catch (_) {}
  writeState({ docket_id: id });
  return id;
}

async function readDocket() {
  const id = await ensureDocket();
  const res = await sheets().spreadsheets.values.get({ spreadsheetId: id, range: DOCKET_TAB + '!A2:M' });
  return (res.data.values || []).map((row, i) => {
    const o = { row: i + 2 };
    HEADERS.forEach((h, j) => { o[h] = row[j] || ''; });
    return o;
  });
}

let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function nextNumber(cls) {
  const rows = await readDocket();
  return rows.filter(r => r.Class === cls).reduce((m, r) => Math.max(m, parseInt(r.Number, 10) || 0), 0) + 1;
}

async function appendDocket(entry) {
  const id = await ensureDocket();
  const row = HEADERS.map(h => entry[h] === undefined ? '' : String(entry[h]));
  await sheets().spreadsheets.values.append({ spreadsheetId: id, range: DOCKET_TAB + '!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [row] } });
}

async function updateCell(rowNumber, header, value) {
  const id = await ensureDocket();
  const col = String.fromCharCode(65 + HEADERS.indexOf(header));
  await sheets().spreadsheets.values.update({ spreadsheetId: id, range: `${DOCKET_TAB}!${col}${rowNumber}`, valueInputOption: 'RAW', requestBody: { values: [[value]] } });
}

module.exports = { configured, connected, status, authUrl, handleCallback, disconnect, uploadAsGoogleDoc, ensureDocket, readDocket, nextNumber, appendDocket, updateCell, serial, docketId, HEADERS };
