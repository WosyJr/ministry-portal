const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CONTACT = 'kalywolfey@gmail.com';

function shell(title, lede, blocks) {
  return `<section>
    <h2>${esc(title)}</h2>
    <p class="lede">${lede}</p>
    ${blocks.map(([h, body]) => `<div class="section-label">${esc(h)}</div>${body}`).join('')}
    <div class="linkrow" style="margin-top:18px">
      <a class="btn ghost" href="/privacy">Privacy</a>
      <a class="btn ghost" href="/terms">Terms of Use</a>
      <a class="btn ghost" href="/">The Ministries</a>
    </div>
  </section>`;
}

function privacy(updated) {
  return shell(
    'Privacy',
    'This portal is a fan-made roleplaying project for a private Elder Scrolls community. It is not a real government service and holds no real-world authority. This page says plainly what it keeps, where it keeps it, and how to have it removed.',
    [
      ['Who runs it', `<p>The portal is run by one person as a hobby, for the members of a private roleplaying community. There is no company behind it. Questions, corrections and deletion requests go to <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`],

      ['What it keeps about an officer', `<p>When somebody is given an account on the portal, it stores:</p>
      <ul class="plainlist">
        <li>A username and a character name — these are roleplaying identities, not legal names, and nobody is asked for a legal name.</li>
        <li>A password, kept only as a one-way hash. The portal cannot read anyone's password, including its own operator.</li>
        <li>The rank held, the Hold assigned, and what the rank is permitted to do.</li>
        <li>A record of actions taken inside the portal — what was filed, sealed, judged or amended, and when — so the community can see who did what.</li>
        <li>Display preferences, such as whether the plain-words tooltips are shown.</li>
      </ul>`],

      ['What it keeps about the roleplay itself', `<p>The documents of the roleplay — petitions, licences, judgments, writs, reports and the registers that list them. These are works of fiction written by members for the game. They mention invented people, invented places and invented events.</p>`],

      ['If Discord is linked', `<p>Linking a Discord account is optional and is only ever started by the person themselves. When it is linked the portal stores the Discord numeric user id, the username and the avatar reference, and nothing else. It asks Discord only for the <code>identify</code> permission, which does not give it access to messages, servers or email. The access token is discarded as soon as the link is made. A link can be undone at any time by asking the Minister.</p>`],

      ['Google Drive and Google Sheets', `<p>The portal stores the roleplay's documents in the <b>operator's own</b> Google Drive, using the operator's own Google account. Nobody else connects a Google account to it, and the portal never reads any other person's Drive.</p>
      <p>What it does with that access:</p>
      <ul class="plainlist">
        <li>Creates and reads the documents it files, in folders it uses for the purpose.</li>
        <li>Creates and reads one spreadsheet, the Docket, which lists those documents.</li>
      </ul>
      <p>It does not browse, index, scan or copy anything else in that Drive. It does not share Google data with anybody, does not use it for advertising, does not sell it, and does not use it to train any model. The connection can be withdrawn at any time from the portal's own settings or from the Google account's permissions page, and the portal then stops reaching Google altogether.</p>
      <p>The portal's use of information received from Google APIs follows the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Google API Services User Data Policy</a>, including its Limited Use requirements.</p>`],

      ['Who can see what', `<p>Pages marked public are readable by anybody who visits. Everything else is readable only by officers signed in to the portal, and some of it only by the ranks it concerns — an inquisition, for instance, is readable only by the Inquisitors assigned to it and by the head of that Ministry.</p>`],

      ['Who it is shared with', `<p>Nobody. The portal has no advertising, no analytics service, no tracking pixels and no third-party scripts collecting anything about visitors. Its data is not sold, rented or handed on. The only outside services it speaks to are Google, for the storage described above, and Discord, for an account link somebody chose to make.</p>`],

      ['Cookies', `<p>One cookie, which keeps a person signed in and guards forms against cross-site submission. It carries no advertising or tracking identifier. Clearing it signs the person out.</p>`],

      ['How long it is kept', `<p>Accounts and documents are kept while the community is running. An account can be struck off at any time on request, and an off-site encrypted backup copy, if one has been made, is overwritten on its next run.</p>`],

      ['Removing what is held about you', `<p>Write to <a href="mailto:${CONTACT}">${CONTACT}</a> and say what you want removed. Accounts, character records and Discord links are removed on request. Documents written in the roleplay may be kept where other members' records depend on them, but the authorship can be detached on request.</p>`],

      ['Children', `<p>The portal is not directed at children, does not knowingly keep information about anyone under 13, and asks for no age, birth date or any other such detail from anybody.</p>`],

      ['Changes', `<p>If this page changes, the date below changes with it.</p>
      <p class="hint">Last updated ${esc(updated)}.</p>`]
    ]
  );
}

function terms(updated) {
  return shell(
    'Terms of Use',
    'The portal is a fan-made roleplaying tool, offered free to the members of a private Elder Scrolls community. These terms are short and say what is expected of anyone using it.',
    [
      ['It is a game', `<p>Everything in this portal is fiction. Its Ministries, offices, laws, ranks, judgments and officers are invented for roleplay. Nothing here is a real legal instrument, nothing here carries real authority, and no document produced by it means anything outside the game.</p>`],

      ['Not affiliated with anybody', `<p>This is an unofficial fan project. It is not made, endorsed, sponsored or approved by Bethesda Softworks, ZeniMax Media, Microsoft, or any other rightsholder in The Elder Scrolls. Those names and the setting belong to their owners, and are used here only as a fan work refers to the thing it is a fan of.</p>`],

      ['Accounts', `<p>Accounts are given out by the operator to members of the community. Keep the password to yourself, and do not sign in as somebody else. Tell the operator if an account is used without permission.</p>`],

      ['What is expected', `<p>Use the portal for the roleplay it was built for. Do not use it to harass anybody, to post anything unlawful, or to publish real-world personal information about any person. Do not try to reach records your rank is not meant to see, and do not attack, overload or probe the service.</p>`],

      ['What members write', `<p>The documents members write stay theirs. By filing one in the portal they allow it to be stored, shown and archived here so the community can use it. The operator may remove anything that breaks these terms or the community's own rules.</p>`],

      ['Accounts may be ended', `<p>An account may be suspended or struck off where these terms or the community's rules are broken, or where somebody simply asks to leave. Anybody may stop using the portal at any time.</p>`],

      ['No warranty', `<p>The portal is offered as it stands, free of charge, with no guarantee that it will be available, correct or unbroken. It may go down, lose a change or be taken away at any time. Keep your own copy of anything you cannot bear to lose.</p>`],

      ['Limits', `<p>To the extent the law allows, the operator is not liable for any loss arising from use of the portal. It is a hobby project for a game.</p>`],

      ['Changes', `<p>These terms may change as the portal does. The date below changes with them.</p>
      <p class="hint">Last updated ${esc(updated)}. Questions go to <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`]
    ]
  );
}

function installPage() {
  const step = (n, head, body) => `<div style="display:flex;gap:16px;margin-bottom:22px">
    <div style="flex:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-weight:600">${n}</div>
    <div style="min-width:0"><b>${head}</b><br><span class="small">${body}</span></div>
  </div>`;
  return `<section>
    <h2>Put the Ministry on your machine</h2>
    <p class="lede">The portal can be installed like an ordinary program. It gets its own icon, its own window with no address bar round it, and an entry in the Start Menu. Nothing is downloaded and nothing needs updating \u2014 it is this same hall, in a window of its own.</p>

    <div class="section-label">On Windows, in Chrome</div>
    ${step(1, 'Look at the right-hand end of the address bar', 'There is a small screen-with-an-arrow icon. Press it.')}
    ${step(2, 'Choose Install', 'If you do not see the icon, open the three-dot menu, then Cast, save and share, then Install page as app.')}
    ${step(3, 'It opens in its own window', 'Windows adds it to the Start Menu. Right-click its taskbar button and choose Pin to taskbar to keep it there.')}

    <div class="section-label">On Windows, in Edge</div>
    ${step(1, 'Open the three-dot menu', 'At the top right of the window.')}
    ${step(2, 'Apps, then Install this site as an app', 'Edge asks for a name \u2014 Ministry is already filled in.')}
    ${step(3, 'Tick what you want', 'Edge offers to pin it to the taskbar and start it when you sign in. Both are fine.')}

    <div class="section-label">On a phone</div>
    <p>On Android, Chrome offers to add it by itself, or use the three-dot menu and Add to Home screen. On an iPhone, press the Share button and choose Add to Home Screen.</p>

    <div class="section-label">What you get</div>
    <ul class="plainlist">
      <li>Its own icon and window, with no browser tabs or address bar.</li>
      <li>It opens even with no connection \u2014 you are told the hall cannot be reached rather than shown a browser error, and anything held is still held.</li>
      <li>Right-click the icon for shortcuts straight to My Desk, the Docket, or laying a petition.</li>
      <li>It updates itself. There is no version to keep up with.</li>
    </ul>

    <div class="linkrow" style="margin-top:18px"><a class="btn ghost" href="/">The Ministries</a></div>
  </section>`;
}

const GITHUB = 'https://github.com/WosyJr/ministry-portal';

function downloadPage(found, size) {
  const card = (head, body, cta) => `<div style="background:var(--paper);border:1px solid var(--line);border-radius:3px;padding:24px 26px">
    <h3 style="margin:0 0 10px">${head}</h3>
    <div class="small" style="line-height:1.6;margin-bottom:${cta ? '16px' : '0'}">${body}</div>
    ${cta || ''}
  </div>`;

  return `<section>
    <h2>The Ministry on your own machine</h2>
    <p class="lede">The portal can live on your desktop as a program of its own \u2014 its own icon, its own window, and a seat in the system tray that tells you when something wants your hand.</p>

    <div class="section-label">Download</div>
    ${found ? `<div class="linkrow" style="margin-bottom:8px">
      <a class="btn big" href="/download/MinistryPortalSetup.exe" download>Download MinistryPortalSetup.exe</a>
      <a class="btn ghost" href="/app">Or put the website on your taskbar instead</a>
    </div>
    <p class="hint">Windows, 64-bit${found.version ? ' \u00b7 version ' + esc(found.version) : ''}${found.size ? ' \u00b7 ' + esc(size(found.size)) : ''}${found.at ? ' \u00b7 put out ' + esc(new Date(found.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })) : ''}</p>`
    : `<div class="panel" style="max-width:620px"><p style="margin:0 0 8px"><b>Not published yet.</b></p>
      <p class="small" style="margin:0">The installer has not been put out. Nothing is wrong with your machine \u2014 come back shortly, or <a href="/app">put the website on your taskbar</a> in the meantime, which needs no download at all.</p></div>`}
    <p class="hint">The first time you run it Windows says <b>&ldquo;Windows protected your PC&rdquo;</b> \u2014 press <b>More info</b>, then <b>Run anyway</b>. It asks once and never again. That notice appears because the program carries no paid signing certificate, not because anything is wrong with it.</p>

    <div class="section-label">What it does that a browser tab does not</div>
    <div class="wargrid" style="margin-bottom:10px">
      ${card('It tells you', 'A Windows notice when a record wants your seal, when a letter arrives, or when a return falls due. The icon on the taskbar carries the number.')}
      ${card('It sits in the tray', 'Close the window and it keeps its seat. Right-click for your Desk, the Docket, or to leave the hall properly.')}
      ${card('It signs you in with Discord', 'No password to keep. The app knows you by the Discord already set against your name on the rolls.')}
      ${card('It says where you are', 'Discord shows the hall you are standing in, if you want it to. It never names a record, an officer or a case.')}
      ${card('It opens Ministry links', 'A link posted in Discord opens the right page in the app, already signed in, instead of a browser tab.')}
      ${card('It keeps itself current', 'When a new version is put out the app fetches it and asks to restart. There is no version to keep track of.')}
    </div>

    <div class="section-label">What it does not do</div>
    <p>It keeps no records of its own. Everything filed through the app goes to the same Docket and the same archives as the website, because the app <i>is</i> the website in a window of its own. Nothing is stored twice, so nothing can fall out of step. All it holds on your machine is who you are signed in as, where the window sat, and your own switches.</p>

    <div class="section-label">If you would rather not install anything</div>
    <p>Nothing here is required. The portal works exactly as it always has in a browser, and officers who prefer a password may carry on using one. <a href="/app">This page</a> shows how to put the website itself on your taskbar without downloading a program.</p>

    <div class="linkrow" style="margin-top:18px"><a class="btn ghost" href="/">The Ministries</a><a class="btn ghost" href="/privacy">Privacy</a></div>
  </section>`;
}

module.exports = { privacy, terms, installPage, downloadPage, CONTACT };
