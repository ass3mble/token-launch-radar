// Local mirror of the token-radar-01 gate's seven rows, from RULES.txt.
// Usage: node scripts/check-gate.mjs <out dir> <snapshot.json>
// Exit 0 when every row passes, 1 otherwise. This is a local check only: the
// server's sealed scorer is the authority, and this script does not judge quality.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { buildDossier } from '../vendor/makefun-board.ts';

const [outDir, snapPath] = process.argv.slice(2);
if (!outDir || !snapPath) {
  console.error('usage: node scripts/check-gate.mjs <out dir> <snapshot.json>');
  process.exit(2);
}

const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
const snapSlugs = new Set(snap.protocols.map((p) => p.slug));
const watchlist = snap.watchlist;
let fail = 0;
const row = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fail++;
};

/** Walk a directory's regular files, relative paths. */
function walk(dir, base = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(path).isDirectory()) out.push(...walk(path, rel));
    else if (statSync(path).isFile()) out.push(rel);
  }
  return out;
}

// 1. dashboard_files
{
  const dir = join(outDir, 'dashboard');
  let detail = '';
  let ok = existsSync(join(dir, 'index.html'));
  const files = ok ? walk(dir) : [];
  const css = files.filter((f) => f.endsWith('.css'));
  const js = files.filter((f) => f.endsWith('.js'));
  const totalBytes = files.reduce((n, f) => n + statSync(join(dir, f)).size, 0);
  if (files.length > 400) { ok = false; detail = `${files.length} files`; }
  if (totalBytes > 4_194_304) { ok = false; detail = `${totalBytes} bytes`; }
  const badName = files.find((f) => /(^|\/)[.-]/.test(f) || f.length > 128 || !/^[A-Za-z0-9._\/-]+$/.test(f));
  if (badName) { ok = false; detail = `bad name ${badName}`; }
  if (css.length < 1 || js.length < 1) { ok = false; detail = 'needs at least one .css and one .js'; }
  const net = /(href|src)\s*=\s*["']https?:|url\(\s*["']?https?:|from\s+["']https?:|import\(\s*["']https?:|require\(\s*["']https?:/i;
  for (const f of files) {
    const ext = extname(f);
    if (!['.html', '.css', '.js'].includes(ext)) continue;
    if (net.test(readFileSync(join(dir, f), 'utf8'))) { ok = false; detail = `${f} names a network address`; break; }
  }
  row('dashboard_files', ok, detail || `${files.length} files, ${totalBytes} bytes`);
}

// 2. board_file + 3. sorted_by_value + 4. coverage + 5. farm_steps
{
  const boardPath = join(outDir, 'board.json');
  let detail = '';
  let ok = true;
  const raw = readFileSync(boardPath, 'utf8');
  if (Buffer.byteLength(raw) > 8_388_608) { ok = false; detail = 'over 8 MiB'; }
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : parsed.rows;
  if (!Array.isArray(rows) || rows.length < 100 || rows.length > 4000) { ok = false; detail = `${Array.isArray(rows) ? rows.length : 'not an array'} rows`; }
  const seen = new Set();
  let sorted = true;
  let allSame = rows.length >= 2;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!snapSlugs.has(r.slug)) { ok = false; detail = `invented slug ${r.slug}`; break; }
    if (seen.has(r.slug)) { ok = false; detail = `duplicate slug ${r.slug}`; break; }
    seen.add(r.slug);
    if (typeof r.name !== 'string' || r.name.length === 0) { ok = false; detail = `row ${i} has no name`; break; }
    if (!Number.isSafeInteger(r.rank) || r.rank <= 0) { ok = false; detail = `row ${i} bad rank`; break; }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0 || r.implied_value_usd > 1e14) { ok = false; detail = `row ${i} bad implied value`; break; }
    if (r.rank !== i + 1) sorted = false;
    if (i > 0 && r.implied_value_usd > rows[i - 1].implied_value_usd) sorted = false;
    if (i > 0 && r.implied_value_usd !== rows[0].implied_value_usd) allSame = false;
    if (!Array.isArray(r.farm_steps) || r.farm_steps.length < 3 || r.farm_steps.length > 12) { ok = false; detail = `${r.slug} has ${r.farm_steps?.length} farm steps`; break; }
    for (const s of r.farm_steps) {
      if (typeof s !== 'string' || s.trim().length < 20 || s.trim().length > 600) { ok = false; detail = `${r.slug} has a farm step of ${s.trim().length} chars`; break; }
    }
    if (!ok) break;
  }
  row('board_file', ok, detail || `${rows.length} rows`);
  row('sorted_by_value', ok && sorted && !allSame, sorted ? (allSame ? 'all implied values equal' : `${rows.length} rows, ranks 1..N, non-increasing`) : 'ranks or order wrong');
  const missing = watchlist.filter((s) => !seen.has(s));
  row('coverage', missing.length === 0, missing.length === 0 ? `all ${watchlist.length} watchlist slugs covered` : `missing ${missing.slice(0, 5).join(', ')}`);
  row('farm_steps', ok, `${rows.length} rows checked`);
}

// 6. screenshots
{
  const dir = join(outDir, 'screenshots');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.')) : [];
  let ok = files.length >= 3 && files.length <= 4;
  let detail = `${files.length} images`;
  const pngDims = (buf) => {
    if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  };
  for (const f of files) {
    const buf = readFileSync(join(dir, f));
    if (buf.length > 524_288) { ok = false; detail = `${f} is ${buf.length} bytes`; break; }
    const dims = pngDims(buf);
    if (!dims) { ok = false; detail = `${f} is not a PNG`; break; }
    const longSide = Math.max(dims.w, dims.h);
    const shortSide = Math.min(dims.w, dims.h);
    if (longSide > 1440 || shortSide < 800) { ok = false; detail = `${f} is ${dims.w}x${dims.h}`; break; }
    detail = `${files.length} images, ${dims.w}x${dims.h}`;
  }
  row('screenshots', ok, detail);
}

// 7. dossier_matches
{
  const built = Buffer.from(buildDossier(outDir, { text_max_bytes: 65_536, screenshots: { max: 4, max_bytes: 524_288 }, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));
  const saved = readFileSync(join(outDir, 'dossier.json'));
  const ok = built.equals(saved) && saved.length <= 1_572_864;
  row('dossier_matches', ok, ok ? `${saved.length} bytes` : 'dossier.json differs from a fresh buildDossier');
}

process.exit(fail === 0 ? 0 : 1);
