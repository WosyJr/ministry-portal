const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { google } = require('googleapis');
const C = require('./config');

const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];
const STATE_FILE = () => path.join(C.DATA_DIR, 'google.json');
const DOCKET_TAB = 'Docket';
const HEADERS = ['Record No', 'Class', 'Number', 'Date (4E)', 'Subject', 'Filed By', 'Folder', 'Document', 'Status', 'Public', 'Summary', 'Filed At (UTC)', 'Form',
  'Hold', 'Assigned To', 'Linked', 'Sealed By', 'Doc Id', 'Closed At (UTC)', 'Updated At (UTC)', 'Fields'];
const col = i => { let s = ''; i += 1; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const LAST = col(HEADERS.length - 1);

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
  if (!connected()) throw new Error('The Ministry archives are not connected to Google yet. The Minister must connect them in the Minister’s Study.');
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
async function trash(fileId) {
  if (!fileId) return;
  await drive().files.update({ fileId, requestBody: { trashed: true }, fields: 'id' });
}
async function fileMeta(fileId) {
  const res = await drive().files.get({ fileId, fields: 'id, name, mimeType, parents, modifiedTime, trashed, size' });
  return res.data;
}
async function listFolder(folderId) {
  const out = [];
  let pageToken;
  do {
    const res = await drive().files.list({ q: `'${folderId}' in parents and trashed = false`, fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)', orderBy: 'folder, modifiedTime desc', pageSize: 200, pageToken });
    out.push(...res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken && out.length < 1000);
  return out;
}
const EXPORTABLE = ['application/vnd.google-apps.document', 'application/vnd.google-apps.spreadsheet', 'application/vnd.google-apps.presentation', 'application/vnd.google-apps.drawing'];
async function fileContent(meta) {
  if (EXPORTABLE.includes(meta.mimeType)) {
    const res = await drive().files.export({ fileId: meta.id, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
    return { mime: 'application/pdf', data: Buffer.from(res.data) };
  }
  if (meta.mimeType === 'application/pdf' || /^image\//.test(meta.mimeType)) {
    const res = await drive().files.get({ fileId: meta.id, alt: 'media' }, { responseType: 'arraybuffer' });
    return { mime: meta.mimeType, data: Buffer.from(res.data) };
  }
  return null;
}

function docketId() { return C.DOCKET_SHEET_ID || readState().docket_id || ''; }

let headersChecked = false;
async function ensureDocket() {
  let id = docketId();
  const s = sheets();
  if (!id) {
    const created = await s.spreadsheets.create({
      requestBody: {
        properties: { title: 'Ministry Administrative Docket (Live)' },
        sheets: [{ properties: { title: DOCKET_TAB, gridProperties: { frozenRowCount: 1 } } }]
      },
      fields: 'spreadsheetId'
    });
    id = created.data.spreadsheetId;
    try {
      await drive().files.update({ fileId: id, addParents: C.FOLDERS.ledgers, removeParents: 'root', fields: 'id' });
    } catch (_) {}
    writeState({ docket_id: id });
    headersChecked = false;
  }
  if (!headersChecked) {
    const res = await s.spreadsheets.values.get({ spreadsheetId: id, range: `${DOCKET_TAB}!A1:${LAST}1` });
    const have = (res.data.values && res.data.values[0]) || [];
    if (have.length < HEADERS.length || HEADERS.some((h, i) => have[i] !== h)) {
      await s.spreadsheets.values.update({ spreadsheetId: id, range: DOCKET_TAB + '!A1', valueInputOption: 'RAW', requestBody: { values: [HEADERS] } });
    }
    headersChecked = true;
  }
  return id;
}

async function readDocket() {
  const id = await ensureDocket();
  const res = await sheets().spreadsheets.values.get({ spreadsheetId: id, range: `${DOCKET_TAB}!A2:${LAST}` });
  return (res.data.values || []).map((row, i) => {
    const o = { row: i + 2 };
    HEADERS.forEach((h, j) => { o[h] = row[j] || ''; });
    return o;
  }).filter(o => o['Record No']);
}

let chain = Promise.resolve();
function serial(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function appendDocket(entry) {
  const id = await ensureDocket();
  const row = HEADERS.map(h => entry[h] === undefined ? '' : String(entry[h]));
  await sheets().spreadsheets.values.append({ spreadsheetId: id, range: DOCKET_TAB + '!A1', valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [row] } });
}

async function updateRow(rowNumber, patch) {
  const id = await ensureDocket();
  const data = Object.entries(patch).filter(([h]) => HEADERS.includes(h)).map(([h, v]) => ({ range: `${DOCKET_TAB}!${col(HEADERS.indexOf(h))}${rowNumber}`, values: [[v === undefined || v === null ? '' : String(v)]] }));
  if (!data.length) return;
  await sheets().spreadsheets.values.batchUpdate({ spreadsheetId: id, requestBody: { valueInputOption: 'RAW', data } });
}
async function updateCell(rowNumber, header, value) { return updateRow(rowNumber, { [header]: value }); }

async function deleteRow(rowNumber) {
  const id = await ensureDocket();
  const meta = await sheets().spreadsheets.get({ spreadsheetId: id, fields: 'sheets.properties' });
  const tab = meta.data.sheets.find(s => s.properties.title === DOCKET_TAB) || meta.data.sheets[0];
  await sheets().spreadsheets.batchUpdate({ spreadsheetId: id, requestBody: { requests: [{ deleteDimension: { range: { sheetId: tab.properties.sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }] } });
}

module.exports = { configured, connected, status, authUrl, handleCallback, disconnect, uploadAsGoogleDoc, trash, fileMeta, listFolder, fileContent, ensureDocket, readDocket, appendDocket, updateRow, updateCell, deleteRow, serial, docketId, HEADERS };
