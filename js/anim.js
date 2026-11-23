// Animationen. Alles entfällt, wenn „Bewegung reduzieren“ eingeschaltet ist.
import { fmt } from './ui.js';

export const motionOK = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Zahl von a nach b hochzählen (deutsche Tausenderpunkte)
export function countUp(el, from, to, ms = 600) {
  if (!el) return;
  if (!motionOK() || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Einmal kurz aufblinken (z. B. Mindestbestand-Warnung)
export function blink(el) {
  if (!el || !motionOK()) return;
  el.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 900, easing: 'ease-in-out' });
}

// Kurzes Aufleuchten einer Zeile, deren Wert sich geändert hat
export function flash(el) {
  if (!el || !motionOK()) return;
  el.animate([{ backgroundColor: 'var(--brass-soft)' }, { backgroundColor: 'transparent' }], { duration: 1200, easing: 'ease-out' });
}

// Patronenparade: Patronen fahren nacheinander aufs Brett
export function paradeIntro(container) {
  if (!container || !motionOK()) return;
  container.querySelectorAll('.parade-item').forEach((item, i) => {
    item.querySelector('svg')?.animate(
      [{ transform: 'translateY(110%)', opacity: 0 }, { transform: 'translateY(-4%)', opacity: 1, offset: 0.75 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 520, delay: i * 70, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' },
    );
    const num = item.querySelector('[data-count]');
    if (num) setTimeout(() => countUp(num, 0, Number(num.dataset.count), 600), i * 70 + 150);
  });
}

// Hülsenauswurf: kleine Messinghülsen fliegen im Bogen aus dem Knopf
const CASING = '<svg viewBox="0 0 6 14" width="9" height="21" aria-hidden="true"><defs><linearGradient id="hx" x1="0" x2="1"><stop offset="0" stop-color="#5a3f14"/><stop offset=".35" stop-color="#fbe7a8"/><stop offset=".6" stop-color="#c79a45"/><stop offset="1" stop-color="#4a3210"/></linearGradient></defs><path d="M.6 0h4.8v12.2l.6.4v1.4H0v-1.4l.6-.4z" fill="url(#hx)" stroke="rgba(0,0,0,.4)" stroke-width=".3"/></svg>';

export function ejectCasings(fromEl, count) {
  if (!fromEl || !motionOK()) return;
  const r = fromEl.getBoundingClientRect();
  const n = Math.max(1, Math.min(6, Math.round(count / 6)));
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'casing';
    c.innerHTML = CASING;
    c.style.left = `${r.left + r.width / 2 - 4}px`;
    c.style.top = `${r.top + r.height / 2 - 10}px`;
    document.body.append(c);
    const dx = 50 + Math.random() * 110;
    const up = 70 + Math.random() * 70;
    const rot = 360 + Math.random() * 540;
    const delay = i * 55;
    c.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px,${-up}px) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px,${-up * 0.2 + 220}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 850, delay, easing: 'cubic-bezier(.25,.6,.5,1)', fill: 'backwards' },
    ).finished.then(() => c.remove(), () => c.remove());
  }
}
