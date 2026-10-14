#!/usr/bin/env node
// Build base-model.json (the shared starting model) from labelled audio/video files.
//
// Usage:
//   node tools/ingest.mjs --catmeows path/to/CatMeows/dataset   # files named C_NNNNN_BB_SS_OOOOO_RXX.wav
//   node tools/ingest.mjs --folders path/to/my-clips            # my-clips/<context>/<file>, e.g. my-clips/doi_an/clip1.mp4
//   (both flags can be combined)   --out base-model.json  --source "CatMeows + clip nội bộ"
//
// Needs ffmpeg on PATH (decodes any audio or video). Uses exactly the same
// feature code as the app (assets/core.js), so the model matches what the
// browser measures.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../assets/core.js');

const CONTEXTS = ['doi_an','ra_vao','choi','vuot','mot_minh','chao','kho_chiu','san_moi','meo_khac','khac'];
const CATMEOWS = { F: 'doi_an', B: 'vuot', I: 'mot_minh' }; // waiting for food, brushing, isolation
const EXT = /\.(wav|mp3|m4a|aac|ogg|opus|flac|webm|mp4|mov|3gp|mkv)$/i;
const SR = 22050;

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = opt('--out', 'base-model.json');
const source = opt('--source', '');
const jobs = [];

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }

if (opt('--catmeows')) {
  for (const f of walk(opt('--catmeows')).filter(f => EXT.test(f))) {
    const m = path.basename(f).match(/^([BFI])_([A-Z0-9]+)_/i);
    if (!m) continue;
    jobs.push({ file: f, label: CATMEOWS[m[1].toUpperCase()], group: 'cm-' + m[2], origin: 'CatMeows', split: false });
  }
}
if (opt('--folders')) {
  const root = opt('--folders');
  for (const d of fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory())) {
    if (!CONTEXTS.includes(d.name)) { console.warn(`Bỏ qua thư mục "${d.name}": tên phải là một trong ${CONTEXTS.join(', ')}`); continue; }
    for (const f of walk(path.join(root, d.name)).filter(f => EXT.test(f))) {
      // optional cat name: my-clips/doi_an/<cat>__clip.mp4 groups clips of one cat for honest evaluation
      const g = path.basename(f).split('__')[0];
      jobs.push({ file: f, label: d.name, group: 'own-' + (path.basename(f).includes('__') ? g : path.basename(f)), origin: 'own', split: true });
    }
  }
}
if (!jobs.length) { console.error('Không có file nào. Xem hướng dẫn ở đầu file.'); process.exit(1); }

function decode(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-t', '120', '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1'], { maxBuffer: 1 << 28 });
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

// Split a long clip into vocal "bouts" (sounds separated by >0.6 s of quiet).
function bouts(x) {
  const F = core.analyze(x, SR);
  if (!F.segs.length) return [];
  const groups = []; let cur = null;
  for (const s of F.segs) {
    const t0 = F.frames[s.start].t, t1 = F.frames[s.end].t + 0.04;
    if (cur && t0 - cur.t1 < 0.6) cur.t1 = t1; else { cur = { t0, t1 }; groups.push(cur); }
  }
  return groups.map(g => x.subarray(Math.max(0, Math.floor((g.t0 - 0.15) * SR)), Math.min(x.length, Math.ceil((g.t1 + 0.15) * SR))));
}

const samples = [];
let fail = 0;
// Inverse-frequency weights so the most common context does not dominate (see docs/BENCHMARK.md).
const balance = arr => { const c = {}; arr.forEach(s => c[s.label] = (c[s.label] || 0) + 1); const k = Object.keys(c).length || 1; return arr.map(s => ({ ...s, w: arr.length / (k * c[s.label]) })); };
for (const j of jobs) {
  let x;
  try { x = decode(j.file); } catch (e) { fail++; console.warn('Không đọc được', j.file); continue; }
  const parts = j.split ? bouts(x) : [x];
  for (const p of parts) {
    const F = core.analyze(p, SR);
    if (F.activeDur < 0.08) continue;
    samples.push({ vec: core.featureVector(F), label: j.label, g: j.group, o: j.origin });
  }
}

// Honest evaluation: leave one cat (group) out, so the score reflects a cat the model has never heard.
const groups = [...new Set(samples.map(s => s.g))];
let ok = 0, n = 0; const confusion = {};
for (const g of groups) {
  const train = samples.filter(s => s.g !== g), test = samples.filter(s => s.g === g);
  const m = core.buildModel(balance(train)); if (!m) continue;
  for (const s of test) {
    const r = core.predict(m, s.vec); n++; if (r && r.label === s.label) ok++;
    const k = s.label + ' → ' + (r ? r.label : '—'); confusion[k] = (confusion[k] || 0) + 1;
  }
}
const counts = {}; samples.forEach(s => counts[s.label] = (counts[s.label] || 0) + 1);
const model = {
  version: 1, createdAt: new Date().toISOString(), source: source || [...new Set(samples.map(s => s.o))].join(' + '),
  note: 'CatMeows (Ludovico et al., 2020) chỉ được dùng cho nghiên cứu và mục đích phi thương mại, phải trích dẫn.',
  features: core.FEATURE_NAMES, counts, groups: groups.length,
  evaluation: n ? { method: 'leave-one-cat-out', accuracy: Math.round(100 * ok / n), tested: n } : null,
  samples: balance(samples).map(s => ({ vec: s.vec, label: s.label, w: +s.w.toFixed(3) })),
};
fs.writeFileSync(out, JSON.stringify(model));
console.log(`Đã xử lý ${jobs.length - fail}/${jobs.length} file → ${samples.length} tiếng kêu, ${groups.length} nhóm mèo/clip.`);
console.log('Số mẫu theo ngữ cảnh:', counts);
if (model.evaluation) console.log(`Độ chính xác khi đoán một con mèo chưa từng nghe: ${model.evaluation.accuracy}% (${n} mẫu)`);
console.log('Nhầm lẫn (thật → đoán):', confusion);
console.log('Đã ghi', out);
