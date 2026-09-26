const S = require('./store');

const HOLDS = [
  { id: 'haafingar', name: 'Haafingar', seat: 'Solitude' },
  { id: 'hjaalmarch', name: 'Hjaalmarch', seat: 'Morthal' },
  { id: 'pale', name: 'The Pale', seat: 'Dawnstar' },
  { id: 'winterhold', name: 'Winterhold', seat: 'Winterhold' },
  { id: 'reach', name: 'The Reach', seat: 'Markarth' },
  { id: 'whiterun', name: 'Whiterun', seat: 'Whiterun' },
  { id: 'falkreath', name: 'Falkreath', seat: 'Falkreath' },
  { id: 'eastmarch', name: 'Eastmarch', seat: 'Windhelm' },
  { id: 'rift', name: 'The Rift', seat: 'Riften' }
];
const HOLD_BY_ID = Object.fromEntries(HOLDS.map(h => [h.id, h]));
const HOLD_BY_NAME = Object.fromEntries(HOLDS.map(h => [h.name, h]));

const PERMS = [
  ['Pages', [
    ['desk', 'My Desk and the Staff Hall'],
    ['clerk', 'Clerk Desk'],
    ['docket', 'The Docket (records of their own offices)'],
    ['allrecords', 'See the records of every office'],
    ['archives', 'Archives and the document reader'],
    ['holds', 'Hold dashboards and the Hold map'],
    ['petitions', 'Petition Box (petitions from the people)'],
    ['correspondence', 'Answer records requests from other ministries'],
    ['request', 'Request records from this Ministry'],
    ['bulletin', 'Bulletin board'],
    ['handover', 'Handover notes'],
    ['training', 'Manuals, practice writs and the handbook quiz'],
    ['reports', 'Weekly report and activity log']
  ]],
  ['Powers', [
    ['file', 'File writs in their offices'],
    ['selfseal', 'Seal writs without waiting for approval'],
    ['approve', 'Approve and seal writs (approval queue)'],
    ['status', 'Set status, assign and link records'],
    ['publish', 'Post records to the public Notice Board'],
    ['edit', 'Edit filed records'],
    ['delete', 'Strike records from the rolls'],
    ['picture', 'Save documents as pictures'],
    ['archive', 'Retention flags and archive catalogue'],
    ['officers', 'Enter and manage officers']
  ]],
  ['Imperial War Office', [
    ['warroster', 'See the Legion roster, pay and treasury'],
    ['warmanage', 'Enter and manage Legion personnel and the treasury']
  ]],
  ['Ministry of Justice', [
    ['jusdesk', 'The Hall of Justice and their own desk'],
    ['juscases', 'Read the matters upon the bench'],
    ['jusfile', 'Open new matters and enter papers upon them'],
    ['jusprosecute', 'Bring charges and act for the Empire'],
    ['jusadvocate', 'Act for a party before the bench'],
    ['jusinquire', 'Open and conduct inquisitions'],
    ['jusjudge', 'Sit in judgment, set hearings and give judgment'],
    ['juscomplaints', 'Answer matters laid by the public'],
    ['jusadmin', 'Enter and manage the officers and ranks of Justice']
  ]],
  ['Across the Ministries', [
    ['ministryadmin', 'Enter and manage the officers and ranks of their own ministry']
  ]]
];

const BRANCHES = [
  { id: 'civil', name: 'Ministry of Civil and Administrative Affairs', short: 'Civil Affairs', home: '/hall' },
  { id: 'war', name: 'The Imperial War Office', short: 'War Office', home: '/war-office' },
  { id: 'justice', name: 'The Ministry of Justice', short: 'Justice', home: '/justice' }
];
const BRANCH_IDS = BRANCHES.map(b => b.id);

const PERM_BRANCH = {};
PERMS.forEach(([group, list]) => {
  const b = group === 'Imperial War Office' ? 'war'
    : group === 'Ministry of Justice' ? 'justice'
    : group === 'Across the Ministries' ? 'any'
    : 'civil';
  list.forEach(([k]) => { PERM_BRANCH[k] = b; });
});

function branchOf(r) { return r && BRANCH_IDS.includes(r.branch) ? r.branch : 'civil'; }
function permBranch(k) { return PERM_BRANCH[k] || 'civil'; }
function permsForBranch(branch) { return PERM_KEYS.filter(k => permBranch(k) === branch || permBranch(k) === 'any'); }
function userBranch(u) { return u ? branchOf(get(u.rank)) : 'civil'; }

function mayAdminBranch(u, branch) {
  if (!u) return false;
  if (u.all) return true;
  if (!can(u, 'ministryadmin') && !(branch === 'justice' && can(u, 'jusadmin'))) return false;
  return userBranch(u) === branch;
}
const PERM_KEYS = PERMS.flatMap(([, list]) => list.map(([k]) => k));

const DEPT_IDS = ['civil', 'register', 'press', 'licenses', 'personnel', 'envoys', 'inquiries', 'heraldry', 'directives'];
const GROUPS = ['Ministry', 'Civil Office', 'Administrative Office', 'Imperial War Office', 'Ministry of Justice', 'Judicial Office', 'Crown & Council', 'Other Ministries'];

const BASIC = ['desk', 'bulletin', 'handover', 'training', 'picture'];
const R = (id, name, group, perms, depts, extra = {}) => ({ id, name, group, perms: [...new Set(perms)], depts, ...extra });

const DEFAULT_RANKS = [
  R('minister', 'Minister of State for Civil & Administrative Affairs', 'Ministry', PERM_KEYS, DEPT_IDS, { all: true, directory: true, locked: true }),
  R('private-secretary', 'Private Secretary', 'Ministry', [...BASIC, 'clerk', 'docket', 'allrecords', 'archives', 'holds', 'petitions', 'correspondence', 'reports', 'file', 'selfseal', 'status'], DEPT_IDS, { directory: true, subtitle: 'First Ministerial Secretary' }),
  R('chief', 'Chief of Civil & Administrative Affairs', 'Ministry', [...BASIC, 'clerk', 'docket', 'allrecords', 'archives', 'holds', 'petitions', 'correspondence', 'reports', 'file', 'selfseal', 'approve', 'status', 'publish', 'edit', 'archive', 'officers'], DEPT_IDS, { directory: true }),
  R('envoy-holds', 'Imperial Envoy to the Holds of Skyrim', 'Civil Office', [...BASIC, 'clerk', 'docket', 'archives', 'holds', 'petitions', 'reports', 'file', 'selfseal', 'approve', 'status'], ['civil', 'envoys', 'inquiries'], { directory: true, head: 'civil' }),
  R('adjudicator', 'Imperial Adjudicator', 'Civil Office', [...BASIC, 'clerk', 'docket', 'archives', 'holds', 'file', 'selfseal', 'status'], ['inquiries', 'civil'], { directory: true, subtitle: 'Appointed ad hoc' }),
  R('delegate-reach-haafingar', 'Imperial Delegate to the Reach & Haafingar', 'Civil Office', [...BASIC, 'clerk', 'docket', 'archives', 'holds', 'petitions', 'file', 'status'], ['civil', 'envoys'], { directory: true, holds: ['reach', 'haafingar'] }),
  R('delegate-whiterun-falkreath', 'Imperial Delegate to Whiterun & Falkreath', 'Civil Office', [...BASIC, 'clerk', 'docket', 'archives', 'holds', 'petitions', 'file', 'status'], ['civil', 'envoys'], { directory: true, holds: ['whiterun', 'falkreath'] }),
  R('delegate-rift-eastmarch', 'Imperial Delegate to the Rift & Eastmarch', 'Civil Office', [...BASIC, 'clerk', 'docket', 'archives', 'holds', 'petitions', 'file', 'status'], ['civil', 'envoys'], { directory: true, holds: ['rift', 'eastmarch'] }),
  R('delegate-pale-hjaalmarch', 'Imperial Delegate to the Pale & Hjaalmarch', 'Civil Office', [...BASIC, 'clerk', 'docket', 'archives', 'holds', 'petitions', 'file', 'status'], ['civil', 'envoys'], { directory: true, holds: ['pale', 'hjaalmarch'] }),
  R('civil-clerk', 'Civil Clerk', 'Civil Office', [...BASIC, 'clerk', 'docket', 'archives', 'petitions', 'file', 'status'], ['civil'], { directory: true }),
  R('registrar', 'Imperial Registrar', 'Administrative Office', [...BASIC, 'clerk', 'docket', 'archives', 'correspondence', 'reports', 'file', 'selfseal', 'approve', 'status', 'archive'], ['register', 'press', 'licenses', 'personnel', 'heraldry'], { directory: true, head: 'register' }),
  R('registry-secretary', 'Registry Secretary', 'Administrative Office', [...BASIC, 'clerk', 'docket', 'archives', 'correspondence', 'file', 'status', 'archive'], ['register', 'licenses', 'heraldry', 'press'], { directory: true }),
  R('administrative-clerk', 'Administrative Clerk', 'Administrative Office', [...BASIC, 'clerk', 'docket', 'archives', 'file', 'archive'], ['register'], { directory: true }),
  R('governor', 'Governor of Skyrim', 'Crown & Council', ['desk', 'bulletin', 'docket', 'allrecords', 'archives', 'holds', 'reports', 'picture'], []),
  R('vice-governor', 'Vice Governor of Skyrim', 'Crown & Council', ['desk', 'bulletin', 'docket', 'allrecords', 'archives', 'holds', 'reports', 'picture'], []),
  R('interior', 'Minister of the Interior', 'Other Ministries', ['desk', 'request', 'picture'], [], { ministry: 'Ministry of the Interior' }),
  R('justice', 'Minister of Justice', 'Other Ministries', ['desk', 'request', 'picture'], [], { ministry: 'Ministry of Justice' }),
  R('finance', 'Minister of Finance', 'Other Ministries', ['desk', 'request', 'picture'], [], { ministry: 'Ministry of Finance' }),
  R('war-office', 'Imperial War Office', 'Other Ministries', ['desk', 'request', 'picture'], [], { ministry: 'Imperial War Office' })
];

const JUS = ['jusdesk', 'juscases'];
const JUSTICE_RANKS = [
  R('justice-minister', 'Minister of State for Justice', 'Ministry of Justice',
    [...JUS, 'jusfile', 'jusprosecute', 'jusadvocate', 'jusinquire', 'jusjudge', 'juscomplaints', 'jusadmin', 'ministryadmin'], [],
    { branch: 'justice', directory: true, subtitle: 'Head of the Ministry of Justice' }),
  R('justice-secretary', 'Private Secretary', 'Ministry of Justice',
    [...JUS, 'jusfile', 'juscomplaints'], [], { branch: 'justice', directory: true, subtitle: 'To the Minister of State for Justice' }),
  R('imperial-inquisitor', 'Imperial Inquisitor', 'Ministry of Justice',
    [...JUS, 'jusfile', 'jusinquire'], [], { branch: 'justice', directory: true }),
  R('imperial-justice', 'Imperial Justice', 'Judicial Office',
    [...JUS, 'jusfile', 'jusjudge'], [], { branch: 'justice', directory: true, subtitle: 'Head of the Judicial Office' }),
  R('imperial-prosecutor', 'Imperial Prosecutor', 'Judicial Office',
    [...JUS, 'jusfile', 'jusprosecute'], [], { branch: 'justice', directory: true }),
  R('imperial-advocate', 'Imperial Advocate', 'Judicial Office',
    [...JUS, 'jusfile', 'jusadvocate'], [], { branch: 'justice', directory: true }),
  R('court-clerk', 'Court Clerk', 'Judicial Office',
    [...JUS, 'jusfile', 'juscomplaints'], [], { branch: 'justice', directory: true })
];

function all() {
  const saved = S.read('ranks.json', null);
  if (!saved) return S.write('ranks.json', DEFAULT_RANKS.concat(JUSTICE_RANKS));
  const m = saved.find(r => r.id === 'minister');
  if (m) { m.all = true; m.locked = true; m.perms = PERM_KEYS; m.depts = DEPT_IDS; }
  if (!saved.some(r => r.branch === 'justice')) {
    JUSTICE_RANKS.forEach(r => { if (!saved.some(x => x.id === r.id)) saved.push({ ...r }); });
    S.write('ranks.json', saved);
  }
  return saved;
}
function get(id) { return all().find(r => r.id === id) || null; }
function saveAll(list) { return S.write('ranks.json', list); }

function slugId(name) { return String(name).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'rank'; }

function upsert(id, patch, actor) {
  const list = all();
  let r = list.find(x => x.id === id);
  const scoped = actor && !actor.all;
  const mine = scoped ? userBranch(actor) : null;

  if (r && scoped && branchOf(r) !== mine) throw new Error('That rank belongs to another ministry.');
  if (!r) {
    let nid = slugId(patch.name), i = 2;
    while (list.some(x => x.id === nid)) nid = slugId(patch.name) + '-' + i++;
    r = { id: nid, name: '', group: 'Ministry', perms: ['desk'], depts: [], branch: scoped ? mine : 'civil' };
    if (scoped) { r.perms = []; r.group = mine === 'justice' ? 'Ministry of Justice' : mine === 'war' ? 'Imperial War Office' : 'Ministry'; }
    list.push(r);
  }
  if (scoped) {
    if (patch.perms) {
      const allowed = new Set(permsForBranch(mine));
      const kept = (r.perms || []).filter(k => !allowed.has(k));
      patch = { ...patch, perms: kept.concat(patch.perms.filter(k => allowed.has(k))) };
    }
    delete patch.branch;
    delete patch.all;
    delete patch.locked;
  } else if (patch.branch !== undefined && BRANCH_IDS.includes(patch.branch)) {
    r.branch = patch.branch;
  }
  if (patch.name !== undefined) { const n = String(patch.name).trim().slice(0, 90); if (!n) throw new Error('A rank needs a name.'); r.name = n; }
  if (patch.subtitle !== undefined) r.subtitle = String(patch.subtitle).trim().slice(0, 90);
  if (patch.group !== undefined && GROUPS.includes(patch.group)) r.group = patch.group;
  if (patch.directory !== undefined) r.directory = !!patch.directory;
  if (!r.locked) {
    if (patch.perms) r.perms = patch.perms.filter(p => PERM_KEYS.includes(p));
    if (patch.depts) r.depts = patch.depts.filter(d => DEPT_IDS.includes(d));
    if (patch.holds) r.holds = patch.holds.filter(h => HOLD_BY_ID[h]);
  }
  saveAll(list);
  return r;
}
function remove(id, inUse) {
  const list = all();
  const r = list.find(x => x.id === id);
  if (!r) return;
  if (r.locked) throw new Error('The Minister’s rank cannot be removed.');
  if (inUse) throw new Error('Officers still hold this rank. Give them another rank first.');
  saveAll(list.filter(x => x !== r));
}
function move(id, dir) {
  const list = all();
  const i = list.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  saveAll(list);
}

function can(u, perm) { return !!u && (u.all || (u.perms || []).includes(perm)); }
function isStaff(u) { return !!u && (u.all || (u.perms || []).length > 0); }

module.exports = { BRANCHES, BRANCH_IDS, PERM_BRANCH, branchOf, permBranch, permsForBranch, userBranch, mayAdminBranch, HOLDS, HOLD_BY_ID, HOLD_BY_NAME, PERMS, PERM_KEYS, DEPT_IDS, GROUPS, DEFAULT_RANKS, all, get, upsert, remove, move, can, isStaff };
