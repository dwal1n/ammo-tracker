// „Fertig“-Leiste über der Bildschirmtastatur und Schließen per Tipp daneben.
// iOS zeigt beim Ziffernblock keine Eingabetaste; in installierten Web-Apps fehlt teils auch die eigene Leiste.

const EDITABLE = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=date]), textarea';
const INTERACTIVE = 'input, textarea, select, button, label, a, [data-action], [data-act], .sug';

let bar = null;

function ensureBar() {
  if (bar) return bar;
  bar = document.createElement('div');
  bar.className = 'kb-bar';
  bar.hidden = true;
  bar.innerHTML = '<button type="button">Fertig</button>';
  const btn = bar.querySelector('button');
  // Fokus beim Antippen nicht verlieren, erst beim Loslassen gezielt schließen
  btn.addEventListener('pointerdown', (e) => e.preventDefault());
  btn.addEventListener('click', () => document.activeElement?.blur());
  return bar;
}

// Leiste an der Oberkante der Tastatur ausrichten (sichtbarer Bereich = visualViewport)
function place() {
  if (!bar || bar.hidden) return;
  const vv = window.visualViewport;
  const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  bar.style.top = `${Math.round(bottom - bar.offsetHeight)}px`;
}

function show(target) {
  const b = ensureBar();
  // Offene Dialoge liegen in einer eigenen Ebene: Leiste muss im Dialog stecken
  const host = target.closest('dialog[open]') || document.body;
  if (b.parentNode !== host) host.append(b);
  b.hidden = false;
  place();
}

function hide() {
  if (bar) bar.hidden = true;
}

export function initKeyboard() {
  // Nur auf Geräten mit Bildschirmtastatur (Finger statt Maus)
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (!touch) return;

  document.addEventListener('focusin', (e) => {
    if (e.target.matches?.(EDITABLE)) show(e.target);
  });
  document.addEventListener('focusout', () => {
    // Kurz warten: beim Wechsel ins nächste Feld kommt gleich ein neues focusin
    setTimeout(() => { if (!document.activeElement?.matches?.(EDITABLE)) hide(); }, 50);
  });
  window.visualViewport?.addEventListener('resize', place);
  window.visualViewport?.addEventListener('scroll', place);

  // Tippen auf eine freie Fläche schließt die Tastatur
  document.addEventListener('pointerdown', (e) => {
    const active = document.activeElement;
    if (!active?.matches?.(EDITABLE)) return;
    if (e.target.closest(INTERACTIVE) || e.target.closest('.kb-bar')) return;
    active.blur();
  });
}
