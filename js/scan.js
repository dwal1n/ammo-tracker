// Strichcode- und QR-Erkennung mit ZXing (lokal mitgeliefert, lädt nichts aus dem Internet).
// Die Bibliothek wird erst beim ersten Scan nachgeladen.

let libPromise = null;

export function loadZXing() {
  if (globalThis.ZXing) return Promise.resolve(globalThis.ZXing);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../vendor/zxing.min.js', import.meta.url).href;
      s.onload = () => resolve(globalThis.ZXing);
      s.onerror = () => { libPromise = null; reject(new Error('Scanner konnte nicht geladen werden')); };
      document.head.append(s);
    });
  }
  return libPromise;
}

const FORMAT_NAMES = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'QR_CODE', 'DATA_MATRIX', 'CODE_128'];
let reader = null;

function getReader(Z) {
  if (reader) return reader;
  const hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, FORMAT_NAMES.map((n) => Z.BarcodeFormat[n]));
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  reader = new Z.MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

// Bild (Canvas) in Graustufen für ZXing
function luminance(Z, ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    lum[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return new Z.RGBLuminanceSource(lum, w, h);
}

function tryDecode(Z, source) {
  const r = getReader(Z);
  for (const Bin of [Z.HybridBinarizer, Z.GlobalHistogramBinarizer]) {
    try {
      const res = r.decode(new Z.BinaryBitmap(new Bin(source)));
      return res;
    } catch { /* nichts gefunden, nächster Versuch */ }
    finally { r.reset(); }
  }
  return null;
}

// Liest einen Code aus einer Bildquelle (Video, Bild oder Canvas).
// Versucht mehrere Größen und eine 90°-Drehung (Strichcodes hochkant).
export async function decodeImage(src, { quick = false } = {}) {
  const Z = await loadZXing();
  const sw = src.videoWidth || src.naturalWidth || src.width;
  const sh = src.videoHeight || src.naturalHeight || src.height;
  if (!sw || !sh) return null;
  const sizes = quick ? [960] : [1280, 1800, 900];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  for (const max of sizes) {
    const k = Math.min(1, max / Math.max(sw, sh));
    const w = Math.round(sw * k), h = Math.round(sh * k);
    for (const rotate of quick ? [false] : [false, true]) {
      canvas.width = rotate ? h : w;
      canvas.height = rotate ? w : h;
      ctx.save();
      if (rotate) { ctx.translate(h, 0); ctx.rotate(Math.PI / 2); }
      ctx.drawImage(src, 0, 0, w, h);
      ctx.restore();
      const res = tryDecode(Z, luminance(Z, ctx, canvas.width, canvas.height));
      if (res) return normalize(Z, res);
    }
  }
  return null;
}

function normalize(Z, res) {
  const format = Z.BarcodeFormat[res.getBarcodeFormat()];
  let text = String(res.getText()).trim();
  // UPC-A ist ein EAN-13 mit führender 0: gleiche Packung, gleiche Nummer
  if (format === 'UPC_A' && /^\d{12}$/.test(text)) text = '0' + text;
  const kind = format === 'QR_CODE' || format === 'DATA_MATRIX' ? 'qr' : 'ean';
  return { text, format, kind, id: `${kind}:${text}` };
}
