// Einstieg: Daten laden, Tab-Leiste, Klicks verteilen, Offline-Betrieb einrichten
import * as S from './store.js';
import { ICONS, toast } from './ui.js';
import { motionOK } from './anim.js';
import { initKeyboard } from './keyboard.js';
import * as stock from './views/stock.js';
import * as training from './views/training.js';
import * as history from './views/history.js';
import * as firearms from './views/firearms.js';
import * as settings from './views/settings.js';

const VIEWS = { stock, training, history, firearms, more: settings };
const TABS = [
  ['stock', 'Bestand', ICONS.stock],
  ['training', 'Training', ICONS.training],
  ['history', 'Verlauf', ICONS.history],
  ['firearms', 'Waffen', ICONS.firearms],
  ['more', 'Mehr', ICONS.more],
];

const main = document.getElementById('view');
const nav = document.getElementById('tabbar');
let lastTab = null;

function applyTheme() {
  const t = S.state.settings.theme;
  const dark = t === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : t !== 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1a2027' : '#eef0f2');
}

function renderTabbar() {
  const active = !!S.activeSession();
  nav.innerHTML = TABS.map(([id, label, icon]) =>
    `<button class="tab${S.state.tab === id ? ' on' : ''}" data-tab="${id}" aria-current="${S.state.tab === id ? 'page' : 'false'}">
      ${icon}<span>${label}</span>${id === 'training' && active ? '<i class="live" aria-label="Training läuft"></i>' : ''}</button>`).join('');
}

function render() {
  applyTheme();
  const view = VIEWS[S.state.tab];
  const scroll = lastTab === S.state.tab ? window.scrollY : 0;
  main.innerHTML = view.render();
  main.dataset.view = S.state.tab;
  if (lastTab !== S.state.tab) {
    window.scrollTo(0, 0);
    if (lastTab && motionOK()) main.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
  } else {
    window.scrollTo(0, scroll);
  }
  lastTab = S.state.tab;
  renderTabbar();
  view.mount?.(main);
}

S.onRender(render);

nav.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  S.state.tab = b.dataset.tab;
  render();
});

const fail = (err) => { console.error(err); toast('Da ist etwas schiefgegangen. Bitte noch einmal versuchen.'); };
// Durchgänge nie verwerfen, sondern der Reihe nach speichern
const QUEUED = new Set(['add']);
let queue = Promise.resolve();
let busy = false;
main.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = VIEWS[S.state.tab].actions?.[el.dataset.action];
  if (!fn) return;
  if (QUEUED.has(el.dataset.action)) {
    const n = el.dataset.n;
    queue = queue.then(() => fn(main.querySelector(`[data-action="add"][data-n="${n}"]`) || el, e)).catch(fail);
    return;
  }
  // Sonst Doppeltipps abfangen, solange eine Aktion läuft (öffnet z. B. kein Formular doppelt)
  if (busy) return;
  busy = true;
  try { await queue; await fn(el, e); } catch (err) { fail(err); } finally { busy = false; }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

async function start() {
  try {
    await S.init();
  } catch (err) {
    console.error(err);
    main.innerHTML = '<div class="empty"><h2 class="label">Speicher nicht verfügbar</h2><p>Die App kann auf diesem Gerät keine Daten speichern. Im privaten Surfmodus von Safari funktioniert das nicht.</p></div>';
    return;
  }
  initKeyboard();
  // Läuft ein Training, direkt dorthin
  if (S.activeSession()) S.state.tab = 'training';
  // Rückkehr aus dem Handbuch: direkt zu „Mehr“, beim Abschnitt Handbuch
  const fromManual = location.hash === '#mehr';
  if (fromManual) {
    if (!S.activeSession()) S.state.tab = 'more';
    window.history.replaceState(null, '', location.pathname + location.search); // „history“ ist hier das Verlauf-Modul
  }
  render();
  if (fromManual && S.state.tab === 'more') document.getElementById('manual')?.scrollIntoView({ block: 'center' });
  // Browser bitten, die Daten nicht automatisch zu löschen
  navigator.storage?.persist?.().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

start();
