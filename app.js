/* Winter Glow – Skincare- und Treatment-Planer
   Alle Daten bleiben lokal auf dem Gerät (localStorage). */

const STORE_KEY = 'winterglow-v1';
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const WEEKDAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

/* ---------- Typen & Wochenrhythmus ---------- */

const TYPES = {
  retinal: { label: 'Retinal-Abend',            cls: 't-retinal' },
  peel:    { label: 'Peeling-Abend',            cls: 't-peel' },
  reedle:  { label: 'Reedle-Shot-Abend',        cls: 't-reedle' },
  rest:    { label: 'Erholungs-Abend',          cls: 't-rest' },
  pre:     { label: 'Pause vor Microneedling',  cls: 't-pre' },
  mn:      { label: 'Microneedling-Abend',      cls: 't-mn' },
  post:    { label: 'Erholung nach Microneedling', cls: 't-post' },
  pause:   { label: 'Haut-Pause',               cls: 't-pause' }
};

// getDay(): 0 = Sonntag ... 6 = Samstag
const BASE = { 1: 'peel', 2: 'rest', 3: 'retinal', 4: 'retinal', 5: 'rest', 6: 'reedle', 0: 'retinal' };

/* ---------- Zustand ---------- */

const defaults = () => ({
  settings: {
    enabled: { retinal: true, peel: true, reedle: true, glow: true, mn: true },
    mnStart: '',
    mnInterval: 28,
    pauseUntil: ''
  },
  checks: {}
});

let state = load();

function load() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (raw && raw.settings) {
      d.settings = Object.assign(d.settings, raw.settings);
      d.settings.enabled = Object.assign(defaults().settings.enabled, raw.settings.enabled || {});
    }
    if (raw && raw.checks) d.checks = raw.checks;
  } catch (e) { /* ignorieren */ }
  return d;
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignorieren */ }
}

/* ---------- Datums-Helfer ---------- */

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
const longDate = (d) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;

/* ---------- Schritte ---------- */

const STEP = {
  am_wash:  { label: 'Washgel',      hint: 'Sanft einmassieren, lauwarm abspülen' },
  am_wash_g:{ label: 'Washgel (sanft)', hint: 'Besonders mild, ohne Rubbeln' },
  am_vitc:  { label: 'Vitamin C',    hint: 'Auf trockene Haut, kurz einziehen lassen' },
  am_moist: { label: 'Moisturizer',  hint: 'Beruhigend und feuchtigkeitsspendend' },
  am_spf:   { label: 'Sonnencreme',  hint: 'Auch im Winter – großzügig auftragen' },
  pm_wash:  { label: 'Washgel',      hint: 'Make-up und Sonnencreme gründlich entfernen' },
  pm_wash_g:{ label: 'Washgel (sanft)', hint: 'Lauwarm, ohne Rubbeln' },
  pm_glow:  { label: 'Glow Serum (Beauty of Joseon)', hint: '3–4 Tropfen, sanft einklopfen' },
  pm_glow_b:{ label: 'Glow Serum (Beauty of Joseon)', hint: 'Zuerst das Serum, einziehen lassen, dann das Retinal' },
  pm_retinal:{ label: 'Retinal / Tretinoid', hint: 'Erbsengroß, Augenlider und Lippen aussparen' },
  pm_peel:  { label: 'AHA & BHA Peeling', hint: 'Einwirkzeit laut Hersteller, nicht länger' },
  pm_reedle:{ label: 'Reedle Shot',  hint: 'Leichtes Kribbeln ist normal' },
  pm_mn:    { label: 'Microneedling', hint: 'Max. 0,25–0,35 mm, Gerät vorher desinfizieren' },
  pm_moist: { label: 'Moisturizer',  hint: 'Gern etwas großzügiger' },
  pm_moist_c:{ label: 'Moisturizer (beruhigend)', hint: 'Reichhaltig, ohne Wirkstoffe' }
};

const step = (id) => Object.assign({ id }, STEP[id]);

/* ---------- Tagesplan ---------- */

function planFor(d) {
  const s = state.settings;
  const en = s.enabled;
  const key = fmt(d);
  const todayKey = fmt(new Date());

  let type = BASE[d.getDay()];
  if (type === 'retinal' && !en.retinal) type = 'rest';
  if (type === 'peel' && !en.peel) type = 'rest';
  if (type === 'reedle' && !en.reedle) type = 'rest';

  let post = 0;
  if (en.mn && s.mnStart) {
    const n = Number(s.mnInterval) || 28;
    const diff = daysBetween(parse(s.mnStart), d);
    if (diff >= -1) {
      const r = ((diff % n) + n) % n;
      if (r === 0) type = 'mn';
      else if (r === n - 1) type = 'pre';
      else if (r >= 1 && r <= 3) { type = 'post'; post = r; }
    }
  }

  if (s.pauseUntil && key >= todayKey && key <= s.pauseUntil) type = 'pause';

  const gentleAM = type === 'pause' || (type === 'post' && post <= 2);

  const am = gentleAM
    ? ['am_wash_g', 'am_moist', 'am_spf']
    : ['am_wash', 'am_vitc', 'am_spf'];

  let pm = [];
  let notes = [];

  switch (type) {
    case 'retinal':
      pm = ['pm_wash'];
      if (en.glow) pm.push('pm_glow_b');
      pm.push('pm_retinal', 'pm_moist');
      notes = [
        'Heute ist Retinal-Abend. Kein Peeling, kein Reedle Shot und kein Microneedling am selben Abend.',
        'Wenn die Haut spannt oder brennt: Retinal auslassen und den Pausen-Modus nutzen.'
      ];
      break;
    case 'peel':
      pm = ['pm_wash', 'pm_peel', 'pm_moist'];
      notes = [
        'Peeling-Abend: Heute kein Retinal und kein Reedle Shot.',
        'Morgen Erholung. Die Haut darf nach dem Peeling zur Ruhe kommen.',
        'Morgen früh unbedingt Sonnencreme.'
      ];
      break;
    case 'reedle':
      pm = ['pm_wash', 'pm_reedle'];
      if (en.glow) pm.push('pm_glow');
      pm.push('pm_moist');
      notes = [
        'Reedle-Shot-Abend: Heute kein Retinal, keine Säuren (AHA/BHA).',
        'Nicht auf gereizter oder verletzter Haut anwenden.'
      ];
      break;
    case 'rest':
      pm = ['pm_wash'];
      if (en.glow) pm.push('pm_glow');
      pm.push('pm_moist');
      notes = ['Erholungs-Abend: Heute keine Wirkstoffe, nur Pflege. Das schützt die Hautbarriere im Winter.'];
      break;
    case 'pre':
      pm = ['pm_wash'];
      if (en.glow) pm.push('pm_glow');
      pm.push('pm_moist');
      notes = [
        'Morgen ist Microneedling. Heute kein Retinal, keine Säuren, kein Reedle Shot.',
        'Gerät und Hände morgen vor der Anwendung gründlich desinfizieren.'
      ];
      break;
    case 'mn':
      pm = ['pm_wash_g', 'pm_mn', 'pm_moist_c'];
      notes = [
        'Microneedling-Abend. Nur auf sauberer, nicht gereizter Haut und ohne Akne-Stellen oder offene Wunden.',
        'Sanfter Druck, Gerät danach sorgfältig reinigen und desinfizieren.',
        'Heute Nacht und die nächsten 24 Stunden: kein Sport, keine Sauna.',
        'Die nächsten 3 Tage: keine Retinoide, keine Säuren, kein Reedle Shot.'
      ];
      break;
    case 'post':
      pm = ['pm_wash_g'];
      if (en.glow && post >= 2) pm.push('pm_glow');
      pm.push('pm_moist_c');
      notes = [
        `Tag ${post} nach dem Microneedling: Erholung. Keine Retinoide, keine Säuren, kein Reedle Shot.`,
        post <= 2 ? 'Auch morgens bewusst sanft: kein Vitamin C, nur Moisturizer und Sonnencreme.' : 'Morgen geht es mit dem normalen Rhythmus weiter.',
        'Sonnencreme ist jetzt besonders wichtig, die Haut ist UV-empfindlicher.'
      ];
      if (post === 1) notes.push('Glow Serum erst ab Tag 2, die Haut ist heute noch sehr empfindlich.');
      break;
    case 'pause':
      pm = ['pm_wash_g', 'pm_moist_c'];
      notes = [
        'Haut-Pause: Alle Wirkstoffe ruhen. Nur sanft reinigen, Feuchtigkeit und Sonnencreme.',
        'Danach langsam wieder einsteigen, zuerst mit dem Erholungs-Rhythmus und erst dann mit dem Retinal.'
      ];
      break;
  }

  return { type, am: am.map(step), pm: pm.map(step), notes };
}

/* ---------- Abhaken ---------- */

const ck = (dateKey, id) => `${dateKey}|${id}`;
const isDone = (dateKey, id) => !!state.checks[ck(dateKey, id)];

function toggle(dateKey, id) {
  const k = ck(dateKey, id);
  if (state.checks[k]) delete state.checks[k]; else state.checks[k] = 1;
  save();
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.500"/></svg>';

function stepsHTML(dateKey, steps) {
  return `<ul class="steps">${steps.map((s) => `
    <li class="step ${isDone(dateKey, s.id) ? 'done' : ''}" data-key="${dateKey}" data-id="${s.id}">
      <span class="check">${CHECK_SVG}</span>
      <div><div class="label">${s.label}</div><div class="hint">${s.hint}</div></div>
    </li>`).join('')}</ul>`;
}

function dayHTML(d) {
  const key = fmt(d);
  const p = planFor(d);
  const t = TYPES[p.type];
  const amDone = p.am.filter((s) => isDone(key, s.id)).length;
  const pmDone = p.pm.filter((s) => isDone(key, s.id)).length;
  return `
    <div class="card">
      <span class="badge ${t.cls}">${t.label}</span>
      <ul class="notes">${p.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <div class="section-title"><h3>Morgens</h3><span>${amDone}/${p.am.length}</span></div>
      ${stepsHTML(key, p.am)}
    </div>
    <div class="card">
      <div class="section-title"><h3>Abends</h3><span>${pmDone}/${p.pm.length}</span></div>
      ${stepsHTML(key, p.pm)}
    </div>`;
}

/* ---------- Ansichten ---------- */

let tab = 'heute';
let calYear, calMonth, calSel;

function viewHeute() {
  const d = new Date();
  return `
    <p class="date-line">Heute<strong>${longDate(d)}</strong></p>
    ${dayHTML(d)}
    <p class="disclaimer">Tippe auf einen Schritt, um ihn abzuhaken.</p>`;
}

function viewKalender() {
  const now = new Date();
  if (calYear === undefined) { calYear = now.getFullYear(); calMonth = now.getMonth(); calSel = fmt(now); }
  const first = new Date(calYear, calMonth, 1, 12);
  const offset = (first.getDay() + 6) % 7; // Montag = 0
  const days = new Date(calYear, calMonth + 1, 0).getDate();
  const todayKey = fmt(now);

  let cells = ['Mo','Di','Mi','Do','Fr','Sa','So'].map((w) => `<div class="dow">${w}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div class="cell empty"></div>';
  for (let day = 1; day <= days; day++) {
    const d = new Date(calYear, calMonth, day, 12);
    const key = fmt(d);
    const p = planFor(d);
    cells += `<button class="cell ${key === todayKey ? 'today' : ''} ${key === calSel ? 'sel' : ''}" data-day="${key}">
      <span>${day}</span><span class="dot ${TYPES[p.type].cls}"></span></button>`;
  }

  const legend = Object.keys(TYPES).map((k) => `<span><i class="${TYPES[k].cls}"></i>${TYPES[k].label}</span>`).join('');
  const sel = parse(calSel);

  return `
    <div class="cal-head">
      <button class="icon-btn" data-nav="-1" aria-label="Vorheriger Monat">‹</button>
      <h2>${MONTHS[calMonth]} ${calYear}</h2>
      <button class="icon-btn" data-nav="1" aria-label="Nächster Monat">›</button>
    </div>
    <div class="grid">${cells}</div>
    <div class="legend">${legend}</div>
    <p class="date-line"><strong>${longDate(sel)}</strong></p>
    ${dayHTML(sel)}`;
}

const TREATMENTS = [
  {
    name: 'Washgel', color: '--rest', when: 'Morgens und abends',
    how: ['Lauwarmes Wasser, sanft einmassieren, nicht rubbeln.', 'Abends gründlich, um Sonnencreme und Schmutz zu entfernen.'],
    avoid: ['An Peeling-, Microneedling- und Pausen-Tagen besonders mild sein.']
  },
  {
    name: 'Vitamin C', color: '--peel', when: 'Morgens, täglich',
    how: ['Nach dem Reinigen auf trockene Haut, danach Sonnencreme.', 'Im Plan pausiert es an den ersten zwei Tagen nach Microneedling und in der Haut-Pause.'],
    avoid: ['Bei Rötung oder Brennen aussetzen.']
  },
  {
    name: 'Sonnencreme', color: '--peel', when: 'Jeden Morgen',
    how: ['Auch im Winter und bei Wolken, großzügig auftragen.'],
    avoid: ['Besonders wichtig bei Retinal, Peeling und nach Microneedling, weil die Haut UV-empfindlicher ist.']
  },
  {
    name: 'Retinal / Tretinoid', color: '--retinal', when: 'Abends, 3× pro Woche (Mi, Do, So)',
    how: [
      'Nach dem Reinigen, erbsengroße Menge, Augenlider und Lippen aussparen.',
      'Ein Moisturizer davor und/oder danach puffert Trockenheit („Buffer“-Methode, empfohlen von Dermatologin Dr. Sam Bunting).',
      'Dermatologen empfehlen „wenig, aber regelmäßig“. Im Winter ist es völlig in Ordnung, die Stärke zu senken, das besprichst du am besten mit deiner Ärztin.'
    ],
    avoid: [
      'Nicht am selben Abend mit AHA/BHA-Peeling, Reedle Shot oder Microneedling.',
      'Pausieren bei Brennen, Schuppen oder Rötung.',
      'Tretinoin ist verschreibungspflichtig. In Schwangerschaft oder bei Kinderwunsch ärztlich abklären.'
    ]
  },
  {
    name: 'AHA & BHA Peeling', color: '--peel', when: 'Abends, 1× pro Woche (Mo)',
    how: [
      'Einwirkzeit laut Packung einhalten, danach gut abspülen und Moisturizer auftragen.',
      'Beim ersten Mal an einer kleinen Stelle testen.',
      'Wer Retinoide nutzt, verträgt meist weniger Peelings als früher, deshalb nur 1× pro Woche.'
    ],
    avoid: [
      'Nie am selben Abend wie Retinal. Sonst Reizung, und die Wirkstoffe stören sich womöglich gegenseitig.',
      'Nach dem Peeling einen Abend ohne Wirkstoffe einplanen (Dr. Whitney Bowe empfiehlt sogar zwei Nächte Erholung).',
      'Kein Reedle Shot und kein Microneedling am selben Tag.'
    ]
  },
  {
    name: 'Reedle Shot (VT Cosmetics)', color: '--reedle', when: 'Abends, 1× pro Woche (Sa)',
    how: [
      'Nach dem Reinigen anwenden, einmassieren, danach Serum und Moisturizer.',
      'Je nach Stärke: Reedle Shot 100 darf öfter (je nach Verträglichkeit), 300 etwa alle 3 Tage, 700 etwa 1× pro Woche. Nicht zwei Stärken am selben Tag.',
      'Im Plan ist 1× pro Woche eingetragen. Das ist der vorsichtige Einstieg, den du anpassen kannst.',
      'Leichtes Kribbeln ist normal. Vorher an einer kleinen Stelle testen.'
    ],
    avoid: [
      'Nicht am selben Tag mit Retinol/Retinal, AHA, BHA, PHA oder starken Peelings.',
      'Nicht auf gereizter oder verletzter Haut. Nicht mit LED-, Radiofrequenz- oder Wärmegeräten kombinieren.'
    ]
  },
  {
    name: 'Glow Serum (Beauty of Joseon)', color: '--reedle', when: 'Abends an Retinal-, Reedle- und Erholungs-Abenden',
    how: [
      'Propolis + Niacinamide, 3–4 Tropfen nach dem Reinigen, vor dem Moisturizer.',
      'Kann täglich genutzt werden (morgens und abends). Im Plan nutzt du es abends.',
      'Vor dem Retinal auftragen und kurz einziehen lassen. Ob es Reizungen abpuffert, ist nicht belegt.'
    ],
    avoid: [
      'Nicht bei Allergie gegen Bienenprodukte (Propolis).',
      'Nach Microneedling erst ab Tag 2, auch beim Peeling-Abend lassen wir es bewusst weg.'
    ]
  },
  {
    name: 'Microneedling at home', color: '--mn', when: 'Alle 4 Wochen (einstellbar)',
    how: [
      'Nadellänge zuhause nur 0,25 bis 0,35 mm, nichts Längeres.',
      'Einsteiger: alle 2–4 Wochen, volle Heilung zwischen den Sitzungen.',
      'Vorher gründlich reinigen, Gerät desinfizieren, wenig Druck. Nach jeder Anwendung erneut desinfizieren.',
      'Im Plan: 1 Tag vorher Pause von Wirkstoffen, 3 Tage Erholung danach. Quellen nennen mindestens 48 Stunden ohne Retinoide und Säuren.'
    ],
    avoid: [
      'Nicht bei aktiver Akne, offenen Wunden oder gereizter Haut.',
      'Bei sensibler Haut: kürzere Nadeln oder Silikon-Aufsatz. Bei Neigung zu Pigmentflecken lieber keine Metallnadeln.',
      '24 Stunden kein Sport, keine Sauna. Sonnencreme täglich.',
      'Vorab bei Unsicherheit mit Hautärztin oder Kosmetikerin sprechen.'
    ]
  }
];

function viewTreatments() {
  const items = TREATMENTS.map((t) => `
    <details class="tr">
      <summary>
        <span class="swatch" style="background:var(${t.color})"></span>
        <span><div class="name">${t.name}</div><div class="when">${t.when}</div></span>
        <span class="chev">›</span>
      </summary>
      <div class="tr-body">
        <h4>Anwendung</h4><ul>${t.how.map((x) => `<li>${x}</li>`).join('')}</ul>
        <h4>Beachten</h4><ul>${t.avoid.map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
    </details>`).join('');

  return `
    <h2>Treatments</h2>
    ${items}
    <h2>Kombi-Regeln</h2>
    <div class="card">
      <ul class="rule-list">
        <li><span class="no">✕</span>Retinal und AHA/BHA-Peeling nie am selben Abend</li>
        <li><span class="no">✕</span>Retinal und Reedle Shot nie am selben Tag</li>
        <li><span class="no">✕</span>Peeling und Reedle Shot nie am selben Tag</li>
        <li><span class="no">✕</span>Microneedling und alle Wirkstoffe (Retinal, Säuren, Reedle Shot): 1 Tag davor und 3 Tage danach Pause</li>
        <li><span class="yes">✓</span>Glow Serum und Retinal: zuerst Serum, dann Retinal</li>
        <li><span class="yes">✓</span>Glow Serum und Reedle Shot: gut kombinierbar, Reedle Shot zuerst</li>
        <li><span class="yes">✓</span>Vitamin C morgens, Retinal abends: gut getrennt</li>
      </ul>
    </div>
    <h2>Wann Pause?</h2>
    <div class="card">
      <ul class="notes">
        <li>Bei Rötung, Brennen, Spannen oder Schuppen alle Wirkstoffe stoppen.</li>
        <li>Dann nur sanft reinigen, Feuchtigkeit und Sonnencreme. Dafür gibt es in den Einstellungen den Pausen-Modus.</li>
        <li>Nach der Pause langsam wieder einsteigen, zuerst mit Erholungs-Abenden, dann mit Retinal.</li>
        <li>Hält die Reizung an, geh zur Hautärztin.</li>
      </ul>
    </div>
    <p class="disclaimer">Diese App ist eine Orientierung auf Basis allgemeiner Empfehlungen und ersetzt keine ärztliche oder kosmetische Beratung.</p>`;
}

function viewEinstellungen() {
  const s = state.settings;
  const en = s.enabled;
  const today = fmt(new Date());
  const paused = s.pauseUntil && s.pauseUntil >= today;
  const sw = (key, title, sub) => `
    <div class="row">
      <div>${title}${sub ? `<small>${sub}</small>` : ''}</div>
      <label class="switch"><input type="checkbox" data-en="${key}" ${en[key] ? 'checked' : ''}><span class="track"></span></label>
    </div>`;

  return `
    <h2>Meine Treatments</h2>
    <div class="card">
      ${sw('retinal', 'Retinal / Tretinoid', 'Abends, 3× pro Woche')}
      ${sw('peel', 'AHA & BHA Peeling', '1× pro Woche')}
      ${sw('reedle', 'Reedle Shot', '1× pro Woche')}
      ${sw('glow', 'Glow Serum (Beauty of Joseon)', 'Abends')}
      ${sw('mn', 'Microneedling', 'Alle paar Wochen')}
    </div>

    <h2>Microneedling-Termin</h2>
    <div class="card">
      <div class="row">
        <div>Nächster Termin<small>Davon ausgehend wird der Rhythmus berechnet</small></div>
        <input type="date" id="mnStart" value="${s.mnStart}">
      </div>
      <div class="row">
        <div>Abstand</div>
        <select id="mnInterval">
          ${[14, 21, 28].map((n) => `<option value="${n}" ${Number(s.mnInterval) === n ? 'selected' : ''}>alle ${n / 7} Wochen</option>`).join('')}
        </select>
      </div>
    </div>

    <h2>Haut gereizt?</h2>
    <div class="card">
      <p class="hint" style="margin-top:0">${paused ? `Der Pausen-Modus läuft noch bis ${longDate(parse(s.pauseUntil))}. Bis dahin sind alle Wirkstoffe pausiert.` : 'Der Pausen-Modus pausiert alle Wirkstoffe für 3 Tage, übrig bleiben nur Reinigung, Feuchtigkeit und Sonnencreme.'}</p>
      ${paused
        ? '<button class="btn ghost" id="pauseOff">Pausen-Modus beenden</button>'
        : '<button class="btn soft" id="pauseOn">3 Tage Pause starten</button>'}
    </div>

    <h2>Teilen &amp; Daten</h2>
    <div class="card">
      <p class="hint" style="margin-top:0">Jede Person hat ihre eigenen Einstellungen. Deine Daten bleiben nur auf diesem Gerät. Zum Teilen schickst du Freundinnen einfach den Link zur App.</p>
      <button class="btn ghost" id="share">Link teilen</button>
      <button class="btn ghost" id="reset">Alle Daten zurücksetzen</button>
    </div>
    <p class="disclaimer">Orientierung auf Basis allgemeiner Empfehlungen, keine ärztliche Beratung. Bei Unsicherheit, Hauterkrankungen oder Schwangerschaft bitte Hautärztin fragen.</p>`;
}

/* ---------- Rendering & Events ---------- */

const view = document.getElementById('view');

function render() {
  if (tab === 'heute') view.innerHTML = viewHeute();
  else if (tab === 'kalender') view.innerHTML = viewKalender();
  else if (tab === 'treatments') view.innerHTML = viewTreatments();
  else view.innerHTML = viewEinstellungen();
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
}

document.querySelector('.tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  render();
  window.scrollTo(0, 0);
});

view.addEventListener('click', (e) => {
  const st = e.target.closest('.step');
  if (st) {
    toggle(st.dataset.key, st.dataset.id);
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    return;
  }
  const day = e.target.closest('[data-day]');
  if (day) { calSel = day.dataset.day; render(); return; }
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    calMonth += Number(nav.dataset.nav);
    if (calMonth < 0) { calMonth = 11; calYear--; }
    if (calMonth > 11) { calMonth = 0; calYear++; }
    calSel = fmt(new Date(calYear, calMonth, 1, 12));
    render();
    return;
  }
  const id = e.target.id;
  if (id === 'pauseOn') {
    state.settings.pauseUntil = fmt(addDays(new Date(), 2));
    save(); render();
  } else if (id === 'pauseOff') {
    state.settings.pauseUntil = '';
    save(); render();
  } else if (id === 'share') {
    const url = location.href.split('#')[0];
    if (navigator.share) navigator.share({ title: 'Winter Glow', text: 'Meine Skincare-App für den Winter', url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('Link kopiert.'));
    else prompt('Link zum Kopieren:', url);
  } else if (id === 'reset') {
    if (confirm('Wirklich alle Einstellungen und Häkchen löschen?')) {
      state = defaults();
      save(); render();
    }
  }
});

view.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.en) { state.settings.enabled[t.dataset.en] = t.checked; save(); }
  else if (t.id === 'mnStart') { state.settings.mnStart = t.value; save(); }
  else if (t.id === 'mnInterval') { state.settings.mnInterval = Number(t.value); save(); }
});

render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
