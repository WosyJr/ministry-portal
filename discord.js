const crypto = require('crypto');
const C = require('./config');
const U = require('./users');

const API = 'https://discord.com/api/v10';
const AUTH = 'https://discord.com/oauth2/authorize';
const PATH = '/auth/discord/callback';

function configured() {
  return !!(C.DISCORD_CLIENT_ID && C.DISCORD_CLIENT_SECRET);
}

function redirectUri(req) {
  const base = C.BASE_URL || (req ? req.protocol + '://' + req.get('host') : '');
  return base.replace(/\/$/, '') + PATH;
}

function newState() {
  return crypto.randomBytes(18).toString('hex');
}

function authUrl(state, req) {
  const p = new URLSearchParams({
    client_id: C.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri(req),
    response_type: 'code',
    scope: 'identify',
    state,
    prompt: 'none'
  });
  return AUTH + '?' + p.toString();
}

async function exchange(code, req) {
  const body = new URLSearchParams({
    client_id: C.DISCORD_CLIENT_ID,
    client_secret: C.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(req)
  });
  const r = await fetch(API + '/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!r.ok) throw new Error('Discord would not answer the exchange (' + r.status + ').');
  const j = await r.json();
  if (!j.access_token) throw new Error('Discord gave back no token.');
  return j.access_token;
}

async function me(token) {
  const r = await fetch(API + '/users/@me', { headers: { Authorization: 'Bearer ' + token } });
  if (!r.ok) throw new Error('Discord would not say who that is (' + r.status + ').');
  const j = await r.json();
  if (!j.id) throw new Error('Discord gave back no account.');
  return {
    id: String(j.id),
    username: String(j.username || ''),
    name: String(j.global_name || j.username || ''),
    avatar: j.avatar ? String(j.avatar) : ''
  };
}

async function revoke(token) {
  try {
    await fetch(API + '/oauth2/token/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: C.DISCORD_CLIENT_ID,
        client_secret: C.DISCORD_CLIENT_SECRET,
        token
      })
    });
  } catch (_) {}
}

function avatarUrl(d, size) {
  if (!d || !d.id) return '';
  if (d.avatar) return `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=${size || 64}`;
  const n = (BigInt(d.id) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${n}.png`;
}

module.exports = { API, PATH, configured, redirectUri, newState, authUrl, exchange, me, revoke, avatarUrl, U };
