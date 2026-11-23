// Vorgabe-Kaliber. Alle Maße in Millimetern (gerundete C.I.P./SAAMI-Werte).
// family: 'pistol' (randlos, gerade), 'revolver' (Rand, gerade),
//         'rimfire' (Randfeuer), 'rifle' (Flaschenhals, randlos), 'shotgun'
// dims:  rim, base, mouth (Hülsenmund), bullet, caseLen, oal,
//        shoulder/shoulderAt/neckAt nur bei Flaschenhals-Hülsen,
//        head (Messingkopf) nur bei Schrot
// bullet: Standard-Geschossform für die Abbildung
//         'fmj' Vollmantel rund, 'hp' Hohlspitz, 'lead' Blei rund,
//         'wc' Wadcutter, 'spitzer' Spitzgeschoss, 'none'
// caseColor: 'brass' | 'nickel' | 'steel' | 'red' | 'green' | 'blue' | 'black'

export const DEFAULT_CALIBERS = [
  // Kurzwaffe randlos
  { id: 'c-9luger', name: '9 mm Luger', family: 'pistol', bullet: 'fmj', caseColor: 'brass',
    dims: { rim: 9.96, base: 9.93, mouth: 9.65, bullet: 9.02, caseLen: 19.15, oal: 29.69 } },
  { id: 'c-380', name: '9 mm kurz (.380 ACP)', family: 'pistol', bullet: 'fmj', caseColor: 'brass',
    dims: { rim: 9.5, base: 9.5, mouth: 9.5, bullet: 9.0, caseLen: 17.3, oal: 25.0 } },
  { id: 'c-9mak', name: '9 mm Makarov', family: 'pistol', bullet: 'fmj', caseColor: 'steel',
    dims: { rim: 9.96, base: 9.95, mouth: 9.91, bullet: 9.27, caseLen: 18.1, oal: 25.0 } },
  { id: 'c-40sw', name: '.40 S&W', family: 'pistol', bullet: 'hp', caseColor: 'nickel',
    dims: { rim: 10.77, base: 10.77, mouth: 10.75, bullet: 10.17, caseLen: 21.59, oal: 28.83 } },
  { id: 'c-10mm', name: '10 mm Auto', family: 'pistol', bullet: 'fmj', caseColor: 'brass',
    dims: { rim: 10.8, base: 10.8, mouth: 10.8, bullet: 10.17, caseLen: 25.2, oal: 32.0 } },
  { id: 'c-45acp', name: '.45 ACP', family: 'pistol', bullet: 'fmj', caseColor: 'brass',
    dims: { rim: 12.19, base: 12.09, mouth: 12.01, bullet: 11.48, caseLen: 22.81, oal: 32.39 } },

  // Revolver
  { id: 'c-32swl', name: '.32 S&W long', family: 'revolver', bullet: 'wc', caseColor: 'brass',
    dims: { rim: 9.5, base: 8.6, mouth: 8.6, bullet: 7.9, caseLen: 23.4, oal: 24.0 } },
  { id: 'c-38spl', name: '.38 Special', family: 'revolver', bullet: 'lead', caseColor: 'brass',
    dims: { rim: 11.18, base: 9.63, mouth: 9.63, bullet: 9.07, caseLen: 29.34, oal: 39.37 } },
  { id: 'c-357', name: '.357 Magnum', family: 'revolver', bullet: 'hp', caseColor: 'nickel',
    dims: { rim: 11.18, base: 9.63, mouth: 9.63, bullet: 9.07, caseLen: 32.77, oal: 40.0 } },
  { id: 'c-44mag', name: '.44 Magnum', family: 'revolver', bullet: 'lead', caseColor: 'brass',
    dims: { rim: 13.06, base: 11.61, mouth: 11.61, bullet: 10.97, caseLen: 32.6, oal: 40.9 } },
  { id: 'c-45colt', name: '.45 Colt', family: 'revolver', bullet: 'lead', caseColor: 'brass',
    dims: { rim: 12.95, base: 12.2, mouth: 12.2, bullet: 11.48, caseLen: 32.6, oal: 40.6 } },

  // Randfeuer
  { id: 'c-22lr', name: '.22 lfB', family: 'rimfire', bullet: 'lead', caseColor: 'brass',
    dims: { rim: 6.99, base: 5.74, mouth: 5.74, bullet: 5.7, caseLen: 15.6, oal: 25.4 } },
  { id: 'c-22wmr', name: '.22 WMR', family: 'rimfire', bullet: 'hp', caseColor: 'nickel',
    dims: { rim: 7.5, base: 6.1, mouth: 6.1, bullet: 5.7, caseLen: 26.8, oal: 34.0 } },
  { id: 'c-17hmr', name: '.17 HMR', family: 'rimfire', bullet: 'spitzer', caseColor: 'nickel',
    dims: { rim: 7.5, base: 6.1, shoulder: 6.0, shoulderAt: 21.5, neckAt: 23.2, mouth: 4.5, bullet: 4.37, caseLen: 26.7, oal: 33.0 } },

  // Langwaffe Flaschenhals
  { id: 'c-223', name: '.223 Rem', family: 'rifle', bullet: 'spitzer', caseColor: 'brass',
    dims: { rim: 9.6, base: 9.58, shoulder: 9.0, shoulderAt: 36.5, neckAt: 39.5, mouth: 6.43, bullet: 5.7, caseLen: 44.7, oal: 57.4 } },
  { id: 'c-300blk', name: '.300 AAC Blackout', family: 'rifle', bullet: 'spitzer', caseColor: 'brass',
    dims: { rim: 9.6, base: 9.6, shoulder: 9.1, shoulderAt: 29.5, neckAt: 30.6, mouth: 8.5, bullet: 7.82, caseLen: 34.7, oal: 57.0 } },
  { id: 'c-762x39', name: '7,62 × 39', family: 'rifle', bullet: 'spitzer', caseColor: 'steel',
    dims: { rim: 11.35, base: 11.35, shoulder: 10.07, shoulderAt: 30.5, neckAt: 32.0, mouth: 8.6, bullet: 7.92, caseLen: 38.7, oal: 56.0 } },
  { id: 'c-308', name: '.308 Win', family: 'rifle', bullet: 'spitzer', caseColor: 'brass',
    dims: { rim: 12.01, base: 11.96, shoulder: 11.53, shoulderAt: 39.6, neckAt: 43.4, mouth: 8.72, bullet: 7.82, caseLen: 51.2, oal: 71.1 } },
  { id: 'c-65cm', name: '6,5 Creedmoor', family: 'rifle', bullet: 'spitzer', caseColor: 'brass',
    dims: { rim: 11.95, base: 11.95, shoulder: 11.53, shoulderAt: 39.0, neckAt: 41.0, mouth: 7.5, bullet: 6.72, caseLen: 48.8, oal: 71.8 } },
  { id: 'c-3006', name: '.30-06 Springfield', family: 'rifle', bullet: 'spitzer', caseColor: 'brass',
    dims: { rim: 12.01, base: 11.96, shoulder: 11.2, shoulderAt: 50.0, neckAt: 54.0, mouth: 8.6, bullet: 7.82, caseLen: 63.3, oal: 84.8 } },
  { id: 'c-8x57', name: '8 × 57 IS', family: 'rifle', bullet: 'spitzer', caseColor: 'brass',
    dims: { rim: 11.95, base: 11.95, shoulder: 10.92, shoulderAt: 47.5, neckAt: 50.6, mouth: 8.98, bullet: 8.22, caseLen: 57.0, oal: 80.6 } },

  // Schrot
  { id: 'c-12-70', name: '12/70', family: 'shotgun', bullet: 'none', caseColor: 'red',
    dims: { rim: 22.4, base: 20.6, mouth: 20.6, head: 12, caseLen: 63, oal: 63 } },
  { id: 'c-12-76', name: '12/76', family: 'shotgun', bullet: 'none', caseColor: 'green',
    dims: { rim: 22.4, base: 20.6, mouth: 20.6, head: 16, caseLen: 68, oal: 68 } },
  { id: 'c-20-70', name: '20/70', family: 'shotgun', bullet: 'none', caseColor: 'blue',
    dims: { rim: 19.3, base: 17.5, mouth: 17.5, head: 12, caseLen: 63, oal: 63 } },
];

export const FAMILY_LABELS = {
  pistol: 'Kurzwaffe',
  revolver: 'Revolver',
  rimfire: 'Kleinkaliber / Randfeuer',
  rifle: 'Langwaffe',
  shotgun: 'Schrot',
};

export const BULLET_LABELS = {
  fmj: 'Vollmantel',
  hp: 'Hohlspitz',
  lead: 'Blei rund',
  wc: 'Wadcutter',
  spitzer: 'Spitzgeschoss',
  none: 'Schrot',
};

// Grobe Vorlage für eigene Kaliber: Maße aus Bauform und Geschossdurchmesser schätzen.
export function guessDims(family, bulletMm = 9, caseLenMm) {
  const b = bulletMm;
  switch (family) {
    case 'revolver': {
      const cl = caseLenMm ?? b * 3.2;
      return { rim: b * 1.23, base: b * 1.06, mouth: b * 1.06, bullet: b, caseLen: cl, oal: cl + b * 1.1 };
    }
    case 'rimfire': {
      const cl = caseLenMm ?? b * 2.7;
      return { rim: b * 1.22, base: b * 1.01, mouth: b * 1.01, bullet: b, caseLen: cl, oal: cl + b * 1.7 };
    }
    case 'rifle': {
      const cl = caseLenMm ?? b * 6.5;
      const base = Math.max(b * 1.5, 9.5);
      return { rim: base, base, shoulder: base * 0.94, shoulderAt: cl * 0.8, neckAt: cl * 0.86,
        mouth: b * 1.11, bullet: b, caseLen: cl, oal: cl + b * 2.6 };
    }
    case 'shotgun': {
      const cl = caseLenMm ?? 63;
      return { rim: b * 1.09, base: b, mouth: b, head: 12, caseLen: cl, oal: cl };
    }
    default: {
      const cl = caseLenMm ?? b * 2.1;
      return { rim: b * 1.1, base: b * 1.1, mouth: b * 1.07, bullet: b, caseLen: cl, oal: cl + b * 1.15 };
    }
  }
}
