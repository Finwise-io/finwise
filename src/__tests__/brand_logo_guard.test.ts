/** THE LOGO, EVERYWHERE IT SHOWS (LOGO, 2026-10-30).
 *
 *  His instruction, 2026-10-30: "change the logo to attached". His three files are kept unchanged in
 *  MoneyKeel/documents/other/brand-source-2026-10-30/; scripts/render-brand-assets.py builds every logo picture
 *  the app ships from them (the stray "a" of his "aMoneyKeel" cut off — the lead's decision, drawing
 *  MoneyKeel/documents/other/moneykeel_pres_mock_brand-wordmark_v02.html). The old K is in
 *  assets/brand/archive-2026-10-30/.
 *
 *  WHAT IT READS (it proves it looked): every .ts/.tsx/.js file under src/, app/ and desktop/, and every require of a
 *  file in assets/brand/. Each require is either a placement (an <Image> whose style is a StyleSheet entry with a width
 *  and a height) or a test's comparison; anything else fails the build. For each placement the picture must exist at
 *  1x, 2x and 3x, and the style's width : height must be the picture's within 1.5%, so nothing stretches or squashes.
 *  The icons and the launch screen named in app.config.js are checked by size and by see-through pixels: Apple refuses
 *  an icon with any, and Android trims anything outside the middle circle of its icon.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';

const ROOT = path.join(__dirname, '..', '..');

// ── a PNG reader: size, colour type, whether a see-through chunk exists, and (for 8-bit RGBA) the alpha of each pixel
type Png = { width: number; height: number; colorType: number; bitDepth: number; hasTrns: boolean; alpha?: Uint8Array };
function readPng(file: string, withAlpha = false): Png {
  const buf = fs.readFileSync(file);
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let at = 8; let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0, hasTrns = false;
  const idat: Buffer[] = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at); const type = buf.toString('ascii', at + 4, at + 8); const data = buf.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; interlace = data[12]; }
    if (type === 'tRNS') hasTrns = true;
    if (type === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const png: Png = { width, height, colorType, bitDepth, hasTrns };
  if (withAlpha) {
    expect([bitDepth, colorType, interlace]).toEqual([8, 6, 0]);   // the reader below handles 8-bit RGBA, not interlaced
    const raw = zlib.inflateSync(Buffer.concat(idat)); const bpp = 4; const stride = width * bpp;
    const out = Buffer.alloc(stride * height); const alpha = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      const f = raw[y * (stride + 1)]; const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? out[y * stride + i - bpp] : 0; const b = y > 0 ? out[(y - 1) * stride + i] : 0;
        const c = i >= bpp && y > 0 ? out[(y - 1) * stride + i - bpp] : 0;
        let v = row[i];
        if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
        else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        out[y * stride + i] = v & 0xff;
      }
      for (let x = 0; x < width; x++) alpha[y * width + x] = out[y * stride + x * 4 + 3];
    }
    png.alpha = alpha;
  }
  return png;
}
const seeThrough = (p: Png) => p.colorType === 4 || p.colorType === 6 || p.hasTrns;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(p);
    return /\.(tsx?|jsx?)$/.test(d.name) ? [p] : [];
  });
}

describe('the logo pictures the app ships are his, at the right shape, in every place', () => {
  const files = ['src', 'app', 'desktop'].flatMap((d) => walk(path.join(ROOT, d)));
  const placements: { file: string; asset: string; style: string; width: number; height: number }[] = [];
  const comparisons: string[] = [];
  const unclassified: string[] = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);
    for (const m of src.matchAll(/require\(\s*['"]([^'"]*assets\/brand\/[^'"]+)['"]\s*\)/g)) {
      const asset = path.relative(ROOT, path.resolve(path.dirname(file), m[1]));
      if (/__tests__|\.test\.tsx?$/.test(rel)) { comparisons.push(`${rel} → ${asset}`); continue; }
      // the <Image …> tag this require sits in, and the style entry it names
      const open = src.lastIndexOf('<Image', m.index!);
      const close = src.indexOf('/>', m.index!);
      const tag = open >= 0 && close > 0 ? src.slice(open, close) : '';
      const ref = tag.match(/style=\{(\w+)\.(\w+)\}/);
      const entry = ref ? src.match(new RegExp(`\\n\\s*${ref[2]}: \\{([^\\n]*)\\}`)) : null;
      const w = entry?.[1].match(/\bwidth: ([\d.]+)/); const h = entry?.[1].match(/\bheight: ([\d.]+)/);
      if (!ref || !w || !h) { unclassified.push(`${rel} → ${asset} (no <Image> with a style that sets a width and a height)`); continue; }
      placements.push({ file: rel, asset, style: ref[2], width: Number(w[1]), height: Number(h[1]) });
    }
  }

  test('it read the code, and every require of a logo picture is a placement or a test’s comparison', () => {
    expect(files.length).toBeGreaterThanOrEqual(300);          // src, app and desktop: 300+ files on 2026-10-30
    expect(unclassified).toEqual([]);
    // 2026-10-30: five placements — the top bar's lettering, sign-in's mark and lettering, first run's mark and lettering
    expect(placements.map((p) => `${p.file} · ${p.style} · ${p.asset}`).sort()).toEqual([
      'src/components/TopBar.tsx · brandImg · assets/brand/wordmark.png',
      'src/screens/AuthScreen.tsx · logoMark · assets/brand/mark.png',
      'src/screens/AuthScreen.tsx · wordmark · assets/brand/wordmark.png',
      'src/screens/FirstRunScreen.tsx · introMark · assets/brand/mark.png',
      'src/screens/FirstRunScreen.tsx · introWordmark · assets/brand/wordmark.png',
    ]);
    expect(comparisons.length).toBeGreaterThanOrEqual(3);      // the top bar, sign-in and first run tests compare the lettering
  });

  test('each placement: the picture exists at 1x, 2x and 3x, and the style has its shape (within 1.5%)', () => {
    const wrong: string[] = [];
    for (const p of placements) {
      const base = path.join(ROOT, p.asset).replace(/\.png$/, '');
      const sizes = ['', '@2x', '@3x'].map((s) => `${base}${s}.png`).map((f) => (fs.existsSync(f) ? readPng(f) : null));
      if (sizes.some((s) => s == null)) { wrong.push(`${p.asset}: a 1x, 2x or 3x file is missing`); continue; }
      const art = sizes[2]!.width / sizes[2]!.height;
      for (const s of sizes) if (Math.abs(s!.width / s!.height / art - 1) > 0.02) wrong.push(`${p.asset}: its 1x/2x/3x files differ in shape`);
      const drawn = p.width / p.height;
      if (Math.abs(drawn / art - 1) > 0.015) wrong.push(`${p.file} ${p.style}: ${p.width} × ${p.height} is ${drawn.toFixed(3)} : 1, the picture ${art.toFixed(3)} : 1`);
    }
    expect(placements.length).toBe(5);
    expect(wrong).toEqual([]);
  });

  test('every picture in assets/brand is placed in the app or explained', () => {
    const dir = path.join(ROOT, 'assets', 'brand');
    const placed = new Set(placements.map((p) => path.basename(p.asset, '.png')));
    const files2 = fs.readdirSync(dir).filter((f) => !fs.statSync(path.join(dir, f)).isDirectory() && f !== '.DS_Store');
    const EXPLAINED: Record<string, string> = { 'lockup.png': 'his full logo without the stray a — the launch screen and the website pack are made from it' };
    const unexplained = files2.filter((f) => !placed.has(f.replace(/(@[23]x)?\.png$/, '')) && !EXPLAINED[f]);
    expect(files2.length).toBeGreaterThanOrEqual(7);
    expect(unexplained).toEqual([]);
  });
});

describe('the icons and the launch screen named in app.config.js', () => {
  const config = require(path.join(ROOT, 'app.config.js'));

  test('the iPhone icon is 1024 × 1024 with no see-through pixel (Apple refuses one)', () => {
    expect(config.icon).toBe('./assets/icon.png');
    const icon = readPng(path.join(ROOT, 'assets', 'icon.png'));
    expect([icon.width, icon.height]).toEqual([1024, 1024]);
    expect(seeThrough(icon)).toBe(false);
    expect(config.web.favicon).toBe('./assets/icon.png');
  });

  test('the Android icon keeps every pixel of the mark inside the middle circle Android never trims (66 of 108)', () => {
    expect(config.android.adaptiveIcon.foregroundImage).toBe('./assets/adaptive-icon.png');
    expect(config.android.adaptiveIcon.backgroundColor).toBe('#FFFFFF');
    const ad = readPng(path.join(ROOT, 'assets', 'adaptive-icon.png'), true);
    expect([ad.width, ad.height]).toEqual([1024, 1024]);
    const safe = (1024 * 33) / 108;
    let drawn = 0, outside = 0;
    for (let y = 0; y < ad.height; y++) for (let x = 0; x < ad.width; x++) {
      if (ad.alpha![y * ad.width + x] === 0) continue;
      drawn++;
      if (Math.hypot(x + 0.5 - 512, y + 0.5 - 512) > safe) outside++;
    }
    expect(drawn).toBeGreaterThanOrEqual(80_000);              // it saw the mark: 87,367 drawn pixels on 2026-10-30
    expect(outside).toBe(0);
    expect(drawn).toBeLessThan(1024 * 1024 * 0.5);             // the corners are see-through, so the white comes from the config
  });

  test('the launch screen is 1284 × 2778, the same picture in light and dark mode', () => {
    const plugin = config.plugins.find((p: any) => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];
    expect([config.splash.image, plugin.image, plugin.dark.image]).toEqual(['./assets/splash.png', './assets/splash.png', './assets/splash.png']);
    const sp = readPng(path.join(ROOT, 'assets', 'splash.png'));
    expect([sp.width, sp.height]).toEqual([1284, 2778]);
    expect(seeThrough(sp)).toBe(false);
  });
});

describe('his files and the old logo are kept', () => {
  test('his three files are unchanged, byte for byte, since 2026-10-30', () => {
    const dir = path.join(ROOT, 'MoneyKeel', 'documents', 'other', 'brand-source-2026-10-30');
    const sha = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, f))).digest('hex');
    expect({
      full: sha('founder_logo_full_2026-10-30.png'),
      mark: sha('founder_logo_mark_2026-10-30.png'),
      wordmark: sha('founder_logo_wordmark_2026-10-30.png'),
    }).toEqual({
      full: '97e1cf9f1a607ffbe85688eac59e0fcfa6624afb3c50fe46c54735bb22e67f39',
      mark: 'f0ae33609926f06d662a4e52f11e29fc7d469d8d265ed73d39b36c8d96b00ea3',
      wordmark: '0346f29ac79ce0bc5d206247efc3294ce35d70732a45f25bdfa2b16ab1d946fc',
    });
  });

  test('the K logo it replaced is archived, nothing deleted', () => {
    const dir = path.join(ROOT, 'assets', 'brand', 'archive-2026-10-30');
    expect(fs.readdirSync(dir).filter((f) => f !== '.DS_Store').sort()).toEqual([
      'adaptive-icon.png', 'icon.png', 'mark.png', 'moneykeel-lockup.svg', 'moneykeel-mark.svg', 'splash.png', 'wordmark.png',
    ]);
  });
});

/** EVERY LIVE DRAWING THAT STILL SHOWS THE OLD BRAND SAYS SO, DATED (LOGO, 2026-10-30, the lead's closing order).
 *  A drawing is live when it is a `*_mock_*.html` under MoneyKeel/documents outside archive/ and the JJ-feedback folders, or a
 *  desktop drawing in desktop/mockups. A drawing shows the old brand when it embeds a picture that is byte for byte one of the
 *  archived brand files (assets/brand/archive-2026-10-30/, website-pack/logo/archive-2026-10-30/), or draws it by hand: the name
 *  typed in a lettering box, Plan v06's 'M' tile, or the desktop's 'K' tile. Each such drawing must carry the dated row of
 *  2026-10-30 that names his words and brand-wordmark v02; a drawing that embeds an archived brand file without it fails. */
const sha256 = (b: Buffer) => crypto.createHash('sha256').update(b).digest('hex');
const ARCHIVED = new Map<string, string>();   // a picture archived in both places is named by its first, the app's copy
for (const d of ['assets/brand/archive-2026-10-30', 'MoneyKeel/documents/website-pack/logo/archive-2026-10-30']) {
  for (const f of fs.readdirSync(path.join(ROOT, d)).filter((x) => x.endsWith('.png'))) {
    const h = sha256(fs.readFileSync(path.join(ROOT, d, f)));
    if (!ARCHIVED.has(h)) ARCHIVED.set(h, `${d}/${f}`);
  }
}
const CURRENT = new Map<string, string>(
  fs.readdirSync(path.join(ROOT, 'assets', 'brand')).filter((f) => f.endsWith('.png')).map((f) => [sha256(fs.readFileSync(path.join(ROOT, 'assets', 'brand', f))), f] as [string, string]),
);
function brandIn(html: string) {
  const archived: string[] = [], current: string[] = [];
  let pictures = 0;
  for (const m of html.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)) {
    pictures++;
    const h = sha256(Buffer.from(m[1], 'base64'));
    if (ARCHIVED.has(h)) archived.push(ARCHIVED.get(h)!);
    if (CURRENT.has(h)) current.push(CURRENT.get(h)!);
  }
  const byHand = /class="(?:wordmark|wm)"[^>]*>\s*(?:<[^>]+>\s*)*Money/.test(html) || /class="pl-logo"/.test(html) || /class="kmark"/.test(html);
  const text = html.replace(/<[^>]+>/g, ' ');
  const row = /2026-10-30/.test(text) && text.includes('moneykeel_pres_mock_brand-wordmark_v02.html') && text.includes('“change the logo to attached”');
  return { archived, current, pictures, byHand, row };
}
function liveDrawings(): string[] {
  const walkDocs = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'archive' || d.name.startsWith('JJ-feedback') ? [] : walkDocs(p);
    return /_mock_.*\.html$/.test(d.name) ? [p] : [];
  });
  const desk = path.join(ROOT, 'desktop', 'mockups');
  return [...walkDocs(path.join(ROOT, 'MoneyKeel', 'documents')),
    ...fs.readdirSync(desk).filter((f) => f.endsWith('.html')).map((f) => path.join(desk, f))].map((p) => path.relative(ROOT, p));
}

describe('every live drawing that still shows the old brand carries the dated row of 2026-10-30', () => {
  test('the detector knows the old pictures, and refuses an old picture with no row (a self-check on made-up pages)', () => {
    expect(ARCHIVED.size).toBeGreaterThanOrEqual(5);           // the K pictures and the old lettering, 2026-10-30
    const old = fs.readFileSync(path.join(ROOT, 'assets', 'brand', 'archive-2026-10-30', 'wordmark.png')).toString('base64');
    const page = `<div class="phone"><img src="data:image/png;base64,${old}"></div>`;
    expect(brandIn(page)).toMatchObject({ archived: ['assets/brand/archive-2026-10-30/wordmark.png'], row: false });
    expect(brandIn(page.replace(old, 'AAAA')).archived).toEqual([]);
    const withRow = `${page}<p>2026-10-30 · see ‘MoneyKeel/documents/other/moneykeel_pres_mock_brand-wordmark_v02.html’ · his words: “change the logo to attached”.</p>`;
    expect(brandIn(withRow).row).toBe(true);
    expect(brandIn('<span class="wordmark"><b>Money</b><i>Keel</i></span>').byHand).toBe(true);
  });

  test('it read every live drawing; each that shows the old brand carries the row', () => {
    const files = liveDrawings();
    const seen = files.map((f) => ({ f, ...brandIn(fs.readFileSync(path.join(ROOT, f), 'utf8')) }));
    const old = seen.filter((s) => s.archived.length > 0 || s.byHand);
    if (process.env.BRAND_DEBUG) console.log(JSON.stringify({ files: files.length, pictures: seen.reduce((n, s) => n + s.pictures, 0), old: old.map((s) => s.f), current: seen.filter((s) => s.current.length > 0).map((s) => s.f) }, null, 1));
    const missing = old.filter((s) => !s.row).map((s) => `${s.f}${s.archived.length ? ` embeds ${[...new Set(s.archived)].join(', ')}` : ' draws the old brand by hand'} with no row of 2026-10-30`);
    expect(missing).toEqual([]);
    // COVERAGE, TRUE NUMBERS (2026-10-30): 36 live drawings read (35 under MoneyKeel/documents, 1 desktop); 44 pictures decoded;
    // 0 embed an archived brand picture (Ways to add v10 did, and was re-pointed); 25 draw the old brand by hand and say so (23 type
    // the two-colour name, Plan v06 an 'M' tile, the desktop a 'K' tile); 5 embed his lettering (brand-wordmark v02, Ways to add v10
    // and the three drawn from the build by FX-NW). The count still drawing the old brand may only fall as drawings are redrawn.
    expect(files.length).toBeGreaterThanOrEqual(36);
    expect(seen.reduce((n, s) => n + s.pictures, 0)).toBeGreaterThanOrEqual(40);
    expect(seen.filter((s) => s.archived.length > 0).map((s) => s.f)).toEqual([]);
    expect(old.length).toBeLessThanOrEqual(25);
    expect(seen.filter((s) => s.current.length > 0).length).toBeGreaterThanOrEqual(5);
  });
});
