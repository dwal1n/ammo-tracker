// Gemeinsame UI-Bausteine: Formatierung, Formular-Blätter, Bestätigung, Hinweise.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('de-DE');
export const eur = (n) => (Number(n) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export const eurShot = (n) => (n == null ? 'kein Preis' : (Number(n) || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 3 }));
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const nowLocal = () => {
  const d = new Date();
  return `${today()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};
export const dateDE = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
export const timeDE = (iso) => String(iso || '').slice(11, 16);
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const monthShort = (key) => MONTHS[Number(key.slice(5, 7)) - 1];
export const parseNum = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------------------
// Formular-Blatt (fährt von unten hoch, auf dem iPad mittig)
// fields: [{ name, label, type, value, options:[{value,label,group}], required, min, step, hint, placeholder, inputmode }]
// Rückgabe: { action: 'submit' | <extra.action>, values } oder null bei Abbruch
// ---------------------------------------------------------------------------

function fieldHTML(fd) {
  const id = `f-${fd.name}`;
  const req = fd.required ? ' required' : '';
  const hint = fd.hint ? `<small class="hint">${esc(fd.hint)}</small>` : '';
  const v = fd.value ?? '';
  let input;
  switch (fd.type) {
    case 'select': {
      const groups = new Map();
      for (const o of fd.options) {
        const g = o.group || '';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(o);
      }
      const opt = (o) => `<option value="${esc(o.value)}"${String(o.value) === String(v) ? ' selected' : ''}>${esc(o.label)}</option>`;
      input = `<select id="${id}" name="${fd.name}"${req}>${[...groups].map(([g, os]) =>
        (g ? `<optgroup label="${esc(g)}">${os.map(opt).join('')}</optgroup>` : os.map(opt).join(''))).join('')}</select>`;
      break;
    }
    case 'segmented':
      input = `<div class="segmented" role="radiogroup">${fd.options.map((o) =>
        `<label><input type="radio" name="${fd.name}" value="${esc(o.value)}"${String(o.value) === String(v) ? ' checked' : ''}><span>${esc(o.label)}</span></label>`).join('')}</div>`;
      break;
    case 'checks': {
      // Mehrfachauswahl als antippbare Kacheln, nach Gruppen
      const sel = new Set(v || []);
      const groups = new Map();
      for (const o of fd.options) {
        const g = o.group || '';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(o);
      }
      input = [...groups].map(([g, os]) => `${g ? `<div class="checks-head">${esc(g)}</div>` : ''}<div class="checks">${os.map((o) =>
        `<label class="check"><input type="checkbox" name="${fd.name}" value="${esc(o.value)}"${sel.has(o.value) ? ' checked' : ''}><span>${esc(o.label)}</span></label>`).join('')}</div>`).join('');
      break;
    }
    case 'textarea':
      input = `<textarea id="${id}" name="${fd.name}" rows="3" placeholder="${esc(fd.placeholder || '')}">${esc(v)}</textarea>`;
      break;
    case 'number':
      input = `<input id="${id}" name="${fd.name}" type="text" inputmode="${fd.inputmode || 'numeric'}" value="${esc(v)}" placeholder="${esc(fd.placeholder || '')}" autocomplete="off"${req}${fd.pattern ? ` pattern="${fd.pattern}"` : ''}>`;
      break;
    default:
      input = `<input id="${id}" name="${fd.name}" type="${fd.type || 'text'}" value="${esc(v)}" placeholder="${esc(fd.placeholder || '')}" autocomplete="off"${req}>`;
      if (fd.suggestions?.length) input += `<div class="suggest" data-for="${fd.name}"></div>`;
  }
  return `<div class="field${fd.type === 'segmented' ? ' field-seg' : ''}"><label for="${id}">${esc(fd.label)}</label>${input}${hint}</div>`;
}

// Vorschläge unter einem Textfeld: filtern beim Tippen, Antippen übernimmt den Wert
const MAX_SUGGEST = 8;
function wireSuggestions(dlg, fields) {
  for (const fd of fields) {
    if (!fd.suggestions?.length) continue;
    const input = dlg.querySelector(`[name="${fd.name}"]`);
    const box = dlg.querySelector(`.suggest[data-for="${fd.name}"]`);
    const show = () => {
      const typed = input.value.trim().toLowerCase();
      // Steht schon ein bekannter Name im Feld, die übrigen zum Wechseln anbieten
      const q = fd.suggestions.some((s) => s.toLowerCase() === typed) ? '' : typed;
      const list = fd.suggestions
        .filter((s) => s.toLowerCase() !== typed && (!q || s.toLowerCase().includes(q)))
        .sort((a, b) => (q ? Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)) : 0))
        .slice(0, MAX_SUGGEST);
      box.innerHTML = list.map((s) => `<button type="button" class="sug" data-v="${esc(s)}">${esc(s)}</button>`).join('');
    };
    input.addEventListener('input', show);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.sug');
      if (!b) return;
      input.value = b.dataset.v;
      show();
    });
    show();
  }
}

// Liste ohne Doppelte (Groß/Klein egal), eigene Einträge zuerst
export function uniqueList(...lists) {
  const seen = new Set();
  const out = [];
  for (const s of lists.flat()) {
    const t = String(s || '').trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}

function readValues(form, fields) {
  const fdata = new FormData(form);
  const out = {};
  for (const fd of fields) {
    if (fd.type === 'checks') { out[fd.name] = fdata.getAll(fd.name).map(String); continue; }
    const raw = fdata.get(fd.name);
    out[fd.name] = fd.type === 'number' ? parseNum(raw) : (raw == null ? '' : String(raw).trim());
  }
  return out;
}

export function sheet({ title, fields = [], submit = 'Speichern', intro = '', extra = [], validate }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'sheet';
    dlg.innerHTML = `<form novalidate>
      <header class="sheet-head">
        <button type="button" class="link" data-close>Abbrechen</button>
        <h2 class="label">${esc(title)}</h2>
        ${submit ? `<button type="submit" class="link strong">${esc(submit)}</button>` : '<span></span>'}
      </header>
      <div class="sheet-body">
        ${intro}
        ${fields.length ? `<div class="fields">${fields.map(fieldHTML).join('')}</div>` : ''}
        <p class="form-error" role="alert" hidden></p>
        ${extra.length ? `<div class="extra">${extra.map((b, i) =>
          `<button type="button" class="${b.danger ? 'btn-danger' : b.primary ? 'btn-primary' : 'btn-secondary'}" data-extra="${i}">${esc(b.label)}</button>`).join('')}</div>` : ''}
      </div>
    </form>`;
    document.body.append(dlg);
    wireSuggestions(dlg, fields);
    const form = dlg.querySelector('form');
    const err = dlg.querySelector('.form-error');
    let result = null;

    const finish = (action) => {
      const values = readValues(form, fields);
      if (action === 'submit') {
        for (const fd of fields) {
          if (fd.required && (values[fd.name] === null || values[fd.name] === '')) {
            err.textContent = `Bitte „${fd.label}“ ausfüllen.`;
            err.hidden = false;
            form.querySelector(`[name="${fd.name}"]`)?.focus();
            return;
          }
        }
        const msg = validate?.(values);
        if (msg) { err.textContent = msg; err.hidden = false; return; }
      }
      result = { action, values };
      dlg.close();
    };

    form.addEventListener('submit', (e) => { e.preventDefault(); finish('submit'); });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
      if (e.target.closest('[data-close]')) dlg.close();
      const x = e.target.closest('[data-extra]');
      if (x) finish(extra[Number(x.dataset.extra)].action);
    });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    dlg.showModal();
    const first = dlg.querySelector('.fields input[type="text"]:not([readonly])');
    if (first && fields[0]?.autofocus) first.focus();
  });
}

export async function confirmSheet(title, text, okLabel = 'OK', danger = false) {
  const r = await sheet({
    title, submit: null, intro: `<p class="sheet-text">${esc(text)}</p>`,
    extra: [{ label: okLabel, action: 'ok', danger, primary: !danger }],
  });
  return r?.action === 'ok';
}

// ---------------------------------------------------------------------------
// Hinweis unten am Bildschirm, optional mit Rückgängig
// ---------------------------------------------------------------------------
let toastTimer;
export function toast(text, undo) {
  document.querySelector('.toast')?.remove();
  clearTimeout(toastTimer);
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(text)}</span>${undo ? '<button type="button">Rückgängig</button>' : ''}`;
  if (undo) t.querySelector('button').addEventListener('click', () => { t.remove(); undo(); });
  document.body.append(t);
  toastTimer = setTimeout(() => t.remove(), undo ? 5000 : 2500);
}

// Einfache Symbole (Linien, 24er Raster)
export const ICONS = {
  stock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21V9.5a2 2 0 0 1 .6-1.4L9 6.5V4h2v2.5l1.4 1.6a2 2 0 0 1 .6 1.4V21M15 21V12.5a2 2 0 0 1 .6-1.4L17 9.5V7h2v2.5l1.4 1.6a2 2 0 0 1 .6 1.4V21M3 21h20"/></svg>',
  training: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></svg>',
  history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  firearms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h17l1 2h-6l-1 2h-3l-1.5 6H6l1.5-6H3z"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20L12 3zM12 10v5M12 18v.5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
};
