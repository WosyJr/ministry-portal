const crypto = require('crypto');
const C = require('./config');

const API = 'https://discord.com/api/v10';

function discordConfigured() { return !!(C.DISCORD_CLIENT_ID && C.DISCORD_CLIENT_SECRET); }
function usesGuildRoles() { return !!(C.DISCORD_GUILD_ID && (C.DISCORD_STAFF_ROLE_IDS.length || C.DISCORD_ADMIN_ROLE_IDS.length)); }

function loginUrl(req) {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  const scope = usesGuildRoles() ? 'identify guilds.members.read' : 'identify';
  const q = new URLSearchParams({ client_id: C.DISCORD_CLIENT_ID, redirect_uri: C.BASE_URL + '/auth/discord/callback', response_type: 'code', scope, state, prompt: 'none' });
  return 'https://discord.com/oauth2/authorize?' + q.toString();
}

async function exchange(code) {
  const body = new URLSearchParams({ client_id: C.DISCORD_CLIENT_ID, client_secret: C.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: C.BASE_URL + '/auth/discord/callback' });
  const res = await fetch(API + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error('Discord refused the login (' + res.status + ').');
  return res.json();
}

async function getJSON(url, token) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) return null;
  return res.json();
}

async function resolveUser(accessToken) {
  const me = await getJSON(API + '/users/@me', accessToken);
  if (!me) throw new Error('Could not read your Discord profile.');
  let role = 'guest';
  if (C.STAFF_DISCORD_IDS.includes(me.id)) role = 'staff';
  if (C.ADMIN_DISCORD_IDS.includes(me.id)) role = 'admin';
  let nick = '';
  if (usesGuildRoles()) {
    const member = await getJSON(`${API}/users/@me/guilds/${C.DISCORD_GUILD_ID}/member`, accessToken);
    if (member) {
      nick = member.nick || '';
      const roles = member.roles || [];
      if (role === 'guest' && roles.some(r => C.DISCORD_STAFF_ROLE_IDS.includes(r))) role = 'staff';
      if (roles.some(r => C.DISCORD_ADMIN_ROLE_IDS.includes(r))) role = 'admin';
    }
  }
  return { id: me.id, name: nick || me.global_name || me.username, username: me.username, role };
}

const isStaff = u => !!u && (u.role === 'staff' || u.role === 'admin');
const isAdmin = u => !!u && u.role === 'admin';

function requireStaff(req, res, next) {
  if (isStaff(req.session.user)) return next();
  if (!req.session.user) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
  res.status(403);
  next('forbidden');
}
function requireAdmin(req, res, next) {
  if (isAdmin(req.session.user)) return next();
  if (!req.session.user) { req.session.returnTo = req.originalUrl; return res.redirect('/login'); }
  res.status(403);
  next('forbidden');
}

module.exports = { discordConfigured, loginUrl, exchange, resolveUser, isStaff, isAdmin, requireStaff, requireAdmin };
