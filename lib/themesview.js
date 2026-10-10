const { esc, hidden } = require('./views');
const T = require('./themes');

function page(user, csrf, current) {
  const groups = ['Easy on the eyes', 'Graphite', 'Bolder'];
  const card = t => {
    const s = t.sw;
    return `<article class="thcard" data-night-card="${esc(t.id)}">
      <div class="thprev" style="background:${esc(s.ground)}">
        <div class="thsheet" style="background:${esc(s.page)};border-color:${esc(s.line)}">
          <div class="thhead" style="color:${esc(s.head)}">The Ministry</div>
          <div class="thline" style="background:${esc(s.trim)}"></div>
          <div class="thtext" style="color:${esc(s.ink)}">Your Desk · one thing wants your hand</div>
          <div class="thquiet" style="color:${esc(s.quiet)}">Set down by Nimmi Silver</div>
          <div class="thpaper" style="background:${esc(s.paper)};border-color:${esc(s.line)}"><span style="color:${esc(s.trim)}">IN THE ACCOUNT</span><b style="color:${esc(s.ink)}">13,230.21</b></div>
        </div>
      </div>
      <div class="thbody">
        <h3>${esc(t.name)}${t.id === T.DEFAULT ? ' <span class="chip">The default</span>' : ''}</h3>
        <p>${esc(t.desc)}</p>
        <div class="thsw">${['ground', 'page', 'paper', 'ink', 'trim', 'head'].map(k => `<i style="background:${esc(s[k])}" title="${k}"></i>`).join('')}</div>
        <button type="button" class="btn small thuse" data-night-use="${esc(t.id)}">Use ${esc(t.name)}</button>
        <span class="thon">In use</span>
      </div>
    </article>`;
  };
  return `<section class="themespage">
    <h2>Themes</h2>
    <p class="lede">Choose how the Ministry looks at night. The day stays parchment. ${user ? 'Your choice is kept with your account, so it follows you to any device.' : 'Your choice is kept in this browser.'}</p>
    <div class="thmode">
      <span class="thmode-l">Day or night</span>
      <button type="button" class="btn ghost small" data-mode-use="light">Always day</button>
      <button type="button" class="btn ghost small" data-mode-use="dark">Always night</button>
      <button type="button" class="btn ghost small" data-mode-use="">Follow my device</button>
    </div>
    ${groups.map(g => `<div class="section-label">${esc(g)}</div><div class="thgrid">${T.THEMES.filter(t => t.group === g).map(card).join('')}</div>`).join('')}
    <form id="nightsave" method="post" action="/themes" hidden>${user ? hidden(csrf) : ''}<input type="hidden" name="night" value=""></form>
  </section>
  <script>(function(){
    var d=document.documentElement,signed=${user ? 'true' : 'false'},cur=${JSON.stringify(current || '')};
    function store(k,v){try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);}catch(e){}}
    function get(k){try{return localStorage.getItem(k);}catch(e){return null;}}
    if(!cur)cur=get('ministry-night')||'dusk';
    function apply(n){
      var l=document.getElementById('nightcss');
      if(n==='dusk'){if(l)l.remove();d.removeAttribute('data-night');}
      else{if(!l){l=document.createElement('link');l.rel='stylesheet';l.id='nightcss';document.head.appendChild(l);}l.href='/night/'+n+'.css';d.setAttribute('data-night',n);}
      document.querySelectorAll('[data-night-card]').forEach(function(c){c.classList.toggle('on',c.getAttribute('data-night-card')===n);});
    }
    function mode(m){if(m){d.setAttribute('data-theme',m);}else{d.removeAttribute('data-theme');}store('ministry-theme',m);document.querySelectorAll('[data-mode-use]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-mode-use')===m);});}
    apply(cur);
    var m0=get('ministry-theme')||'';document.querySelectorAll('[data-mode-use]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-mode-use')===m0);});
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('[data-night-use]');
      if(b){var n=b.getAttribute('data-night-use');apply(n);store('ministry-night',n);if(d.getAttribute('data-theme')==='light'||(!d.getAttribute('data-theme')&&!matchMedia('(prefers-color-scheme: dark)').matches))mode('dark');
        if(signed){var f=document.getElementById('nightsave');var fd=new FormData(f);fd.set('night',n);fetch('/themes',{method:'POST',body:new URLSearchParams(fd),headers:{'Content-Type':'application/x-www-form-urlencoded'},credentials:'same-origin'});}
        return;}
      var mb=e.target.closest&&e.target.closest('[data-mode-use]');
      if(mb)mode(mb.getAttribute('data-mode-use'));
    });
  })();</script>`;
}

module.exports = { page };
