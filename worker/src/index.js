// Mèo Ngữ API — Cloudflare Worker + D1 (+ optional R2) + Claude agent.
import { CONTEXTS, OUTCOMES, FELINE_FIVE, KNOWLEDGE } from './knowledge.js';

const MAX_BODY = 64 * 1024;
const MAX_AUDIO = 2 * 1024 * 1024;

export default {
  async fetch(req, env, ctx) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(req, env, ctx);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(e && e.stack || e);
      return json({ error: e.code || 'server_error', message: status >= 500 ? 'Máy chủ gặp lỗi, thử lại sau.' : e.message }, status, cors);
    }
  },
};

// ---------- helpers ----------
class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const bad = (msg, code = 'bad_request') => new HttpError(400, code, msg);
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const now = () => Date.now();
const uid = () => crypto.randomUUID();

function corsHeaders(req, env) {
  const origin = req.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || allowed.includes('*');
  return ok ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-max-age': '86400',
    'vary': 'origin',
  } : { 'vary': 'origin' };
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function readJson(req) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) throw bad('Dữ liệu gửi lên quá lớn.');
  const t = await req.text();
  if (t.length > MAX_BODY) throw bad('Dữ liệu gửi lên quá lớn.');
  if (!t) return {};
  try { return JSON.parse(t); } catch { throw bad('JSON không hợp lệ.'); }
}

const str = (v, max, field) => {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') throw bad(`${field} phải là chữ.`);
  return v.trim().slice(0, max);
};

async function auth(req, env) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer ([A-Za-z0-9_-]{32,128})$/);
  if (!m) throw new HttpError(401, 'unauthorized', 'Thiếu mã thiết bị.');
  const id = await sha256(m[1]);
  await env.DB.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').bind(id, now()).run();
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

async function ownCat(env, user, catId) {
  const cat = await env.DB.prepare('SELECT * FROM cats WHERE id = ? AND user_id = ?').bind(catId, user.id).first();
  if (!cat) throw new HttpError(404, 'not_found', 'Không tìm thấy mèo này.');
  return cat;
}

// ---------- router ----------
async function route(req, env, ctx) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const M = req.method;

  if (p === '/api/health') return json({ ok: true, agent: providerChain(env).length > 0, providers: providerChain(env), audio: !!env.AUDIO });
  if (p === '/api/meta') return json({ contexts: CONTEXTS, outcomes: OUTCOMES, felineFive: FELINE_FIVE });

  const user = await auth(req, env);
  let m;

  if (p === '/api/me' && M === 'GET') {
    const cats = await env.DB.prepare('SELECT * FROM cats WHERE user_id = ? ORDER BY created_at').bind(user.id).all();
    return json({ user: { consent: !!user.consent_at, consentVersion: user.consent_version || null, shareModel: !!user.share_model, shareAudio: !!user.share_audio, agentCallsToday: user.agent_day === today() ? user.agent_calls : 0, agentDailyLimit: limit(env) }, cats: cats.results });
  }
  if (p === '/api/me' && M === 'PATCH') {
    const b = await readJson(req);
    if (b.consent === true) {
      const v = str(b.consentVersion, 20, 'Phiên bản điều khoản') || 'unknown';
      await env.DB.prepare('UPDATE users SET consent_at = ?, consent_version = ? WHERE id = ?').bind(now(), v, user.id).run();
    }
    if (typeof b.shareModel === 'boolean') await env.DB.prepare('UPDATE users SET share_model = ? WHERE id = ?').bind(b.shareModel ? 1 : 0, user.id).run();
    if (typeof b.shareAudio === 'boolean') await env.DB.prepare('UPDATE users SET share_audio = ? WHERE id = ?').bind(b.shareAudio ? 1 : 0, user.id).run();
    return json({ ok: true });
  }
  if (p === '/api/me' && M === 'DELETE') {
    // Right to erasure: remove every row and stored audio of this device account.
    if (env.AUDIO) {
      const keys = await env.DB.prepare('SELECT audio_key FROM sounds WHERE user_id = ? AND audio_key IS NOT NULL').bind(user.id).all();
      for (const r of keys.results) await env.AUDIO.delete(r.audio_key);
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM messages WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM observations WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM sounds WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM personality WHERE cat_id IN (SELECT id FROM cats WHERE user_id = ?)').bind(user.id),
      env.DB.prepare('DELETE FROM cats WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);
    return json({ ok: true });
  }

  // Everything below stores or processes the owner's data: require accepted terms first.
  if (!user.consent_at) throw new HttpError(403, 'consent_required', 'Bạn cần đồng ý Điều khoản và Quyền riêng tư để đồng bộ dữ liệu.');

  if (p === '/api/cats' && M === 'POST') {
    const b = await readJson(req);
    const name = str(b.name, 40, 'Tên');
    if (!name) throw bad('Cần có tên mèo.');
    const id = typeof b.id === 'string' && /^[\w-]{8,64}$/.test(b.id) ? b.id : uid();
    const t = now();
    await env.DB.prepare(`INSERT INTO cats (id,user_id,name,sex,neutered,birth_year,breed,notes,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`)
      .bind(id, user.id, name, catSex(b.sex), bool(b.neutered), year(b.birthYear), str(b.breed, 60, 'Giống'), str(b.notes, 1000, 'Ghi chú'), t, t).run();
    return json(await ownCat(env, user, id), 201);
  }
  if ((m = p.match(/^\/api\/cats\/([\w-]+)$/))) {
    const cat = await ownCat(env, user, m[1]);
    if (M === 'GET') return json(cat);
    if (M === 'PATCH') {
      const b = await readJson(req);
      await env.DB.prepare(`UPDATE cats SET name=COALESCE(?,name), sex=COALESCE(?,sex), neutered=COALESCE(?,neutered),
        birth_year=COALESCE(?,birth_year), breed=COALESCE(?,breed), notes=COALESCE(?,notes), updated_at=? WHERE id=?`)
        .bind(str(b.name, 40, 'Tên'), catSex(b.sex), bool(b.neutered), year(b.birthYear), str(b.breed, 60, 'Giống'), str(b.notes, 1000, 'Ghi chú'), now(), cat.id).run();
      return json(await ownCat(env, user, cat.id));
    }
    if (M === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM messages WHERE cat_id = ?').bind(cat.id),
        env.DB.prepare('DELETE FROM observations WHERE cat_id = ?').bind(cat.id),
        env.DB.prepare('DELETE FROM sounds WHERE cat_id = ?').bind(cat.id),
        env.DB.prepare('DELETE FROM personality WHERE cat_id = ?').bind(cat.id),
        env.DB.prepare('DELETE FROM cats WHERE id = ?').bind(cat.id),
      ]);
      return json({ ok: true });
    }
  }

  if ((m = p.match(/^\/api\/cats\/([\w-]+)\/sounds$/))) {
    const cat = await ownCat(env, user, m[1]);
    if (M === 'GET') {
      const lim = Math.min(500, Number(url.searchParams.get('limit')) || 200);
      const r = await env.DB.prepare('SELECT * FROM sounds WHERE cat_id = ? ORDER BY created_at DESC LIMIT ?').bind(cat.id, lim).all();
      return json(r.results.map(s => ({ ...s, features: safeParse(s.features) })));
    }
    if (M === 'POST') {
      const b = await readJson(req);
      const items = Array.isArray(b) ? b : [b];
      if (items.length > 50) throw bad('Tối đa 50 bản ghi mỗi lần.');
      const stmts = items.map(s => {
        if (!s || typeof s.features !== 'object') throw bad('Thiếu đặc trưng âm thanh.');
        const f = JSON.stringify(s.features);
        if (f.length > 4000) throw bad('Đặc trưng âm thanh quá lớn.');
        const id = typeof s.id === 'string' && /^[\w-]{8,64}$/.test(s.id) ? s.id : uid();
        return env.DB.prepare(`INSERT INTO sounds (id,cat_id,user_id,created_at,source,duration,features,predicted,confidence,label,outcome)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET label=excluded.label, outcome=excluded.outcome WHERE sounds.user_id = excluded.user_id`)
          .bind(id, cat.id, user.id, num(s.createdAt) || now(), s.source === 'upload' ? 'upload' : 'mic', num(s.duration),
            f, ctxKey(s.predicted), clampInt(s.confidence, 0, 100), ctxKey(s.label), outKey(s.outcome));
      });
      await env.DB.batch(stmts);
      return json({ ok: true, count: stmts.length }, 201);
    }
  }
  if ((m = p.match(/^\/api\/sounds\/([\w-]+)$/)) && M === 'PATCH') {
    const s = await env.DB.prepare('SELECT * FROM sounds WHERE id = ? AND user_id = ?').bind(m[1], user.id).first();
    if (!s) throw new HttpError(404, 'not_found', 'Không tìm thấy bản ghi.');
    const b = await readJson(req);
    await env.DB.prepare('UPDATE sounds SET label = COALESCE(?, label), outcome = COALESCE(?, outcome) WHERE id = ?')
      .bind(ctxKey(b.label), outKey(b.outcome), s.id).run();
    return json({ ok: true });
  }
  if ((m = p.match(/^\/api\/sounds\/([\w-]+)\/audio$/)) && M === 'PUT') {
    if (!env.AUDIO) throw new HttpError(501, 'no_storage', 'Máy chủ chưa bật lưu âm thanh.');
    if (!user.share_audio) throw new HttpError(403, 'no_consent', 'Bạn chưa đồng ý chia sẻ bản ghi âm.');
    const s = await env.DB.prepare('SELECT * FROM sounds WHERE id = ? AND user_id = ?').bind(m[1], user.id).first();
    if (!s) throw new HttpError(404, 'not_found', 'Không tìm thấy bản ghi.');
    const type = req.headers.get('content-type') || '';
    if (!/^audio\/(wav|x-wav|webm|ogg|mp4|mpeg)/.test(type)) throw bad('Định dạng âm thanh không hỗ trợ.');
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAX_AUDIO) throw bad('File âm thanh quá 2 MB.');
    const key = `audio/${s.cat_id}/${s.id}`;
    await env.AUDIO.put(key, buf, { httpMetadata: { contentType: type } });
    await env.DB.prepare('UPDATE sounds SET audio_key = ? WHERE id = ?').bind(key, s.id).run();
    return json({ ok: true });
  }

  if ((m = p.match(/^\/api\/cats\/([\w-]+)\/observations$/))) {
    const cat = await ownCat(env, user, m[1]);
    if (M === 'GET') {
      const r = await env.DB.prepare('SELECT * FROM observations WHERE cat_id = ? ORDER BY created_at DESC LIMIT 100').bind(cat.id).all();
      return json(r.results.map(o => ({ ...o, tags: safeParse(o.tags) || [] })));
    }
    if (M === 'POST') {
      const b = await readJson(req);
      const o = await addObservation(env, user, cat, b.kind, b.text, b.tags, 'owner');
      return json(o, 201);
    }
  }

  if ((m = p.match(/^\/api\/cats\/([\w-]+)\/personality$/))) {
    const cat = await ownCat(env, user, m[1]);
    if (M === 'GET') {
      const r = await env.DB.prepare('SELECT * FROM personality WHERE cat_id = ?').bind(cat.id).first();
      return json(r ? { scores: safeParse(r.scores), answers: safeParse(r.answers), updatedAt: r.updated_at } : null);
    }
    if (M === 'PUT') {
      const b = await readJson(req);
      const scores = {};
      for (const k of Object.keys(FELINE_FIVE)) scores[k] = clampInt(b.scores && b.scores[k], 0, 100);
      const answers = {};
      for (const [k, v] of Object.entries(b.answers || {})) if (/^[a-z]{1,3}\d{1,2}$/.test(k)) answers[k] = clampInt(v, 1, 7);
      await env.DB.prepare(`INSERT INTO personality (cat_id, scores, answers, updated_at) VALUES (?,?,?,?)
        ON CONFLICT(cat_id) DO UPDATE SET scores=excluded.scores, answers=excluded.answers, updated_at=excluded.updated_at`)
        .bind(cat.id, JSON.stringify(scores), JSON.stringify(answers), now()).run();
      return json({ ok: true });
    }
  }

  if ((m = p.match(/^\/api\/cats\/([\w-]+)\/messages$/)) && M === 'GET') {
    const cat = await ownCat(env, user, m[1]);
    const r = await env.DB.prepare('SELECT role, content, created_at FROM messages WHERE cat_id = ? ORDER BY created_at DESC LIMIT 40').bind(cat.id).all();
    return json(r.results.reverse());
  }

  if (p === '/api/agent' && M === 'POST') return agent(req, env, user);

  throw new HttpError(404, 'not_found', 'Không có đường dẫn này.');
}

// ---------- validation ----------
const catSex = v => (v === 'duc' || v === 'cai') ? v : null;
const bool = v => typeof v === 'boolean' ? (v ? 1 : 0) : null;
const year = v => { const n = Number(v); return Number.isInteger(n) && n > 1990 && n <= new Date().getUTCFullYear() ? n : null; };
const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
const clampInt = (v, lo, hi) => { const n = Math.round(Number(v)); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null; };
const ctxKey = v => (typeof v === 'string' && CONTEXTS[v]) ? v : null;
const outKey = v => (typeof v === 'string' && OUTCOMES[v]) ? v : null;
const safeParse = s => { try { return JSON.parse(s); } catch { return null; } };
const today = () => new Date().toISOString().slice(0, 10);
const limit = env => Number(env.AGENT_DAILY_LIMIT) || 10;

async function addObservation(env, user, cat, kind, text, tags, author) {
  const k = ['behavior', 'body', 'routine', 'health', 'other'].includes(kind) ? kind : 'other';
  const t = str(text, 1000, 'Nội dung');
  if (!t) throw bad('Cần có nội dung ghi chép.');
  const tg = Array.isArray(tags) ? tags.filter(x => typeof x === 'string').slice(0, 8).map(x => x.slice(0, 30)) : [];
  const o = { id: uid(), cat_id: cat.id, user_id: user.id, created_at: now(), kind: k, text: t, tags: JSON.stringify(tg), author };
  await env.DB.prepare('INSERT INTO observations (id,cat_id,user_id,created_at,kind,text,tags,author) VALUES (?,?,?,?,?,?,?,?)')
    .bind(o.id, o.cat_id, o.user_id, o.created_at, o.kind, o.text, o.tags, o.author).run();
  return { ...o, tags: tg };
}

// ---------- agent ----------
const TOOLS = [
  { name: 'get_cat_profile', description: 'Hồ sơ của con mèo đang được hỏi: tên, giới tính, triệt sản, năm sinh, giống, ghi chú của chủ, và điểm tính cách Feline Five (0–100) nếu chủ đã làm bộ câu hỏi.', input_schema: { type: 'object', properties: {} } },
  { name: 'get_sound_stats', description: 'Thống kê tiếng kêu đã ghi của con mèo trong N ngày gần nhất: tổng số, theo ngữ cảnh chủ đã xác nhận, theo khung giờ trong ngày (giờ Việt Nam), tỉ lệ dịu lại sau khi được đáp lại, và so sánh với kỳ trước để phát hiện thay đổi.', input_schema: { type: 'object', properties: { days: { type: 'integer', minimum: 1, maximum: 90, description: 'Số ngày nhìn lại, mặc định 14' } } } },
  { name: 'get_recent_sounds', description: 'Danh sách các tiếng kêu gần nhất với đặc trưng âm học (thời lượng, cao độ trung vị Hz, xu hướng giọng, số tiếng, độ rè), ngữ cảnh app đoán, ngữ cảnh chủ xác nhận và kết quả sau khi đáp lại.', input_schema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } } } },
  { name: 'get_observations', description: 'Các ghi chép hành vi, ngôn ngữ cơ thể, sinh hoạt, sức khoẻ mà chủ (hoặc trợ lý) đã lưu về con mèo.', input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['behavior', 'body', 'routine', 'health', 'other'] }, limit: { type: 'integer', minimum: 1, maximum: 50 } } } },
  { name: 'save_observation', description: 'Lưu một quan sát mới mà chủ vừa kể trong cuộc trò chuyện, để dùng cho các lần phân tích sau. Chỉ lưu sự kiện chủ thực sự mô tả, không lưu suy đoán của bạn.', input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['behavior', 'body', 'routine', 'health', 'other'] }, text: { type: 'string', description: 'Mô tả ngắn, khách quan, tiếng Việt' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['kind', 'text'] } },
];

function systemPrompt(cat) {
  return `Bạn là "Chuyên gia Mèo Ngữ", trợ lý hành vi mèo trong ứng dụng Mèo Ngữ. Bạn đang trò chuyện với chủ của bé mèo tên "${cat.name}".

Nhiệm vụ:
1. Giải thích vì sao bé có hành vi hoặc tiếng kêu đó, dựa trên DỮ LIỆU THẬT của chính bé (dùng tools) cộng với kiến thức hành vi mèo bên dưới.
2. Hướng dẫn chủ cách đáp lại cụ thể: làm gì ngay bây giờ, làm gì lâu dài, tránh làm gì.
3. Giúp chủ hiểu tính cách bé (Feline Five) và thói quen theo thời gian; chỉ ra xu hướng hoặc thay đổi đáng chú ý.
4. Khi chủ kể một sự việc mới về bé, lưu lại bằng save_observation.

Nguyên tắc:
- Luôn gọi tool để xem dữ liệu trước khi nhận định về bé. Nói rõ khi dữ liệu còn ít (ví dụ dưới 20 tiếng kêu đã gắn nhãn) và đừng kết luận chắc chắn.
- Phân biệt rõ điều dữ liệu cho thấy và điều bạn suy đoán. Không bịa số liệu.
- Bạn không phải bác sĩ thú y, không chẩn đoán bệnh. Khi có dấu hiệu bất thường hoặc khẩn cấp, nói thẳng và khuyên đưa đi thú y; với dấu hiệu khẩn cấp thì khuyên đi ngay.
- Không khuyên phạt, đánh, xịt nước, hét vào mèo.
- Trả lời bằng tiếng Việt, xưng "mình", gọi chủ là "bạn", gọi mèo là "bé ${cat.name}". Ngắn gọn, dễ làm theo: tối đa khoảng 180 chữ trừ khi chủ hỏi sâu. Dùng gạch đầu dòng cho các bước hành động.
- Mã ngữ cảnh: ${Object.entries(CONTEXTS).map(([k, v]) => `${k}=${v}`).join('; ')}. Mã kết quả: ${Object.entries(OUTCOMES).map(([k, v]) => `${k}=${v}`).join('; ')}. Khi nói với chủ, dùng tên tiếng Việt, không dùng mã.

${KNOWLEDGE}`;
}

async function runTool(env, user, cat, name, input) {
  input = input || {};
  if (name === 'get_cat_profile') {
    const p = await env.DB.prepare('SELECT scores, updated_at FROM personality WHERE cat_id = ?').bind(cat.id).first();
    const age = cat.birth_year ? new Date().getUTCFullYear() - cat.birth_year : null;
    return { name: cat.name, sex: cat.sex === 'duc' ? 'đực' : cat.sex === 'cai' ? 'cái' : 'chưa rõ', neutered: cat.neutered == null ? 'chưa rõ' : !!cat.neutered,
      approxAgeYears: age, breed: cat.breed, ownerNotes: cat.notes,
      felineFive: p ? { scores0to100: safeParse(p.scores), updatedAt: new Date(p.updated_at).toISOString().slice(0, 10) } : 'chưa làm bộ câu hỏi' };
  }
  if (name === 'get_sound_stats') {
    const days = clampInt(input.days, 1, 90) || 14;
    const since = now() - days * 864e5, prevSince = since - days * 864e5;
    const rows = (await env.DB.prepare('SELECT created_at, label, predicted, outcome FROM sounds WHERE cat_id = ? AND created_at >= ?').bind(cat.id, prevSince).all()).results;
    const cur = rows.filter(r => r.created_at >= since), prev = rows.filter(r => r.created_at < since);
    const byCtx = {}, byHour = { 'đêm 0-6h': 0, 'sáng 6-12h': 0, 'chiều 12-18h': 0, 'tối 18-24h': 0 }, outcome = {};
    for (const r of cur) {
      const c = r.label || ('(chưa xác nhận, đoán) ' + (r.predicted || 'khac'));
      byCtx[c] = (byCtx[c] || 0) + 1;
      const h = (new Date(r.created_at).getUTCHours() + 7) % 24;
      byHour[h < 6 ? 'đêm 0-6h' : h < 12 ? 'sáng 6-12h' : h < 18 ? 'chiều 12-18h' : 'tối 18-24h']++;
      if (r.outcome) outcome[r.outcome] = (outcome[r.outcome] || 0) + 1;
    }
    return { days, total: cur.length, previousPeriodTotal: prev.length, labeled: cur.filter(r => r.label).length, byContext: byCtx, byTimeOfDay: byHour, outcomes: outcome };
  }
  if (name === 'get_recent_sounds') {
    const lim = clampInt(input.limit, 1, 50) || 15;
    const r = (await env.DB.prepare('SELECT created_at, duration, features, predicted, confidence, label, outcome FROM sounds WHERE cat_id = ? ORDER BY created_at DESC LIMIT ?').bind(cat.id, lim).all()).results;
    return r.map(s => {
      const f = safeParse(s.features) || {};
      return { at: new Date(s.created_at + 7 * 36e5).toISOString().slice(0, 16).replace('T', ' ') + ' (giờ VN)', durationSec: s.duration,
        pitchHz: f.pitch, trend: f.trend, syllables: f.syl, longestSec: f.longest, noisiness: f.zcr, voicedRatio: f.voicedRatio,
        appGuess: s.predicted, appConfidence: s.confidence, ownerLabel: s.label, outcome: s.outcome };
    });
  }
  if (name === 'get_observations') {
    const lim = clampInt(input.limit, 1, 50) || 20;
    const q = input.kind
      ? env.DB.prepare('SELECT created_at, kind, text, tags, author FROM observations WHERE cat_id = ? AND kind = ? ORDER BY created_at DESC LIMIT ?').bind(cat.id, input.kind, lim)
      : env.DB.prepare('SELECT created_at, kind, text, tags, author FROM observations WHERE cat_id = ? ORDER BY created_at DESC LIMIT ?').bind(cat.id, lim);
    return (await q.all()).results.map(o => ({ date: new Date(o.created_at).toISOString().slice(0, 10), kind: o.kind, text: o.text, tags: safeParse(o.tags), by: o.author }));
  }
  if (name === 'save_observation') {
    const o = await addObservation(env, user, cat, input.kind, input.text, input.tags, 'agent');
    return { saved: true, id: o.id };
  }
  return { error: 'unknown tool' };
}

// ---- LLM providers. One question stays on one provider; on failure the next one takes over. ----
class ProviderError extends Error { constructor(provider, status, detail) { super(`${provider} ${status}`); this.provider = provider; this.status = status; this.detail = detail; } }
const toOpenAITools = () => TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));

// Gemini's unpaid tier may not serve users in the EEA, UK or Switzerland.
const NO_FREE_GEMINI = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']);
function providerChain(env, country) {
  let want = (env.AGENT_PROVIDERS || 'gemini,workersai,anthropic').split(',').map(s => s.trim());
  if (country && NO_FREE_GEMINI.has(country) && env.GEMINI_PAID !== 'true') want = want.filter(p => p !== 'gemini');
  const ok = { gemini: !!env.GEMINI_API_KEY, workersai: !!env.AI, anthropic: !!env.ANTHROPIC_API_KEY };
  return want.filter(p => ok[p]);
}

// OpenAI-style loop, used by Gemini (OpenAI-compatible endpoint) and Workers AI.
async function loopOpenAI(env, user, cat, provider, system, history, userContent, saved) {
  const messages = [{ role: 'system', content: system }, ...history, { role: 'user', content: userContent }];
  const tools = toOpenAITools();
  for (let step = 0; step < 6; step++) {
    let msg;
    if (provider === 'gemini') {
      const r = await fetch((env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai') + '/chat/completions', {
        method: 'POST', headers: { authorization: 'Bearer ' + env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: env.GEMINI_MODEL || 'gemini-3.1-flash-lite', messages, tools, tool_choice: 'auto', max_tokens: 4096 }),
      });
      if (!r.ok) throw new ProviderError('gemini', r.status, (await r.text()).slice(0, 300));
      const d = await r.json();
      msg = d.choices && d.choices[0] && d.choices[0].message;
      if (!msg) throw new ProviderError('gemini', 502, 'empty');
    } else {
      let d;
      try { d = await env.AI.run(env.WORKERS_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it', { messages, tools, max_tokens: 4096 }); }
      catch (e) { throw new ProviderError('workersai', 503, String(e && e.message || e).slice(0, 300)); }
      if (d && d.choices && d.choices[0] && d.choices[0].finish_reason === 'length') console.warn('workersai hit token limit at step', step);
      if (d && d.choices && d.choices[0]) msg = d.choices[0].message;
      else msg = { role: 'assistant', content: d && d.response || '', tool_calls: (d && d.tool_calls || []).map((t, i) => ({ id: t.id || 'call_' + step + '_' + i, type: 'function', function: { name: t.name, arguments: typeof t.arguments === 'string' ? t.arguments : JSON.stringify(t.arguments || {}) } })) };
    }
    const calls = msg.tool_calls || [];
    if (!calls.length) return (typeof msg.content === 'string' ? msg.content : '').trim();
    // Keep the assistant turn exactly as returned (Gemini 3 needs extra_content.thought_signature back).
    messages.push({ ...msg, role: 'assistant', content: msg.content || '' });
    for (const c of calls) {
      let input = {}; try { input = JSON.parse(c.function && c.function.arguments || '{}'); } catch { }
      const name = c.function && c.function.name;
      let out; try { out = await runTool(env, user, cat, name, input); if (name === 'save_observation') saved.push(input.text); } catch (e) { out = { error: e.message || 'tool failed' }; }
      messages.push({ role: 'tool', tool_call_id: c.id, name, content: JSON.stringify(out).slice(0, 8000) });
    }
  }
  return '';
}

async function loopAnthropic(env, user, cat, system, history, userContent, saved) {
  const messages = [...history, { role: 'user', content: userContent }];
  while (messages.length && messages[0].role !== 'user') messages.shift();
  for (let step = 0; step < 6; step++) {
    const r = await fetch((env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.AGENT_MODEL || 'claude-haiku-5-5', max_tokens: 1200, system, tools: TOOLS, messages }),
    });
    if (!r.ok) throw new ProviderError('anthropic', r.status, (await r.text()).slice(0, 300));
    const data = await r.json();
    messages.push({ role: 'assistant', content: data.content });
    const uses = data.content.filter(c => c.type === 'tool_use');
    if (data.stop_reason !== 'tool_use' || !uses.length) return data.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    const results = [];
    for (const u of uses) {
      let out;
      try { out = await runTool(env, user, cat, u.name, u.input); if (u.name === 'save_observation') saved.push(u.input.text); }
      catch (e) { out = { error: e.message || 'tool failed' }; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out).slice(0, 8000) });
    }
    messages.push({ role: 'user', content: results });
  }
  return '';
}

async function agent(req, env, user) {
  const chain = providerChain(env, req.cf && req.cf.country);
  if (!chain.length) throw new HttpError(503, 'agent_off', 'Máy chủ chưa cấu hình trợ lý.');
  const b = await readJson(req);
  const cat = await ownCat(env, user, String(b.catId || ''));
  const text = str(b.message, 2000, 'Câu hỏi');
  if (!text) throw bad('Bạn chưa nhập câu hỏi.');

  const d = today();
  const calls = user.agent_day === d ? user.agent_calls : 0;
  if (calls >= limit(env)) throw new HttpError(429, 'quota', `Bạn đã dùng hết ${limit(env)} lượt hỏi hôm nay. Mai quay lại nhé.`);
  await env.DB.prepare('UPDATE users SET agent_day = ?, agent_calls = ? WHERE id = ?').bind(d, calls + 1, user.id).run();

  const hist = (await env.DB.prepare('SELECT role, content FROM messages WHERE cat_id = ? ORDER BY created_at DESC LIMIT 8').bind(cat.id).all()).results.reverse();
  const history = hist.map(h => ({ role: h.role, content: h.content }));
  let userContent = text;
  if (b.lastSound && typeof b.lastSound === 'object') userContent = `${text}\n\n[Tiếng kêu vừa thu trong app: ${JSON.stringify(b.lastSound).slice(0, 1500)}]`;

  // Pre-load profile and 14-day stats so most questions need one or two model calls instead of three.
  const profile = await runTool(env, user, cat, 'get_cat_profile', {});
  const stats = await runTool(env, user, cat, 'get_sound_stats', { days: 14 });
  const system = systemPrompt(cat) + `\n\n# Dữ liệu đã nạp sẵn (không cần gọi lại get_cat_profile hay get_sound_stats 14 ngày)\nHồ sơ: ${JSON.stringify(profile)}\nThống kê 14 ngày: ${JSON.stringify(stats)}`;

  const saved = [];
  let reply = '', used = null, lastErr = null;
  for (const p of chain) {
    try {
      reply = p === 'anthropic' ? await loopAnthropic(env, user, cat, system, history, userContent, saved)
        : await loopOpenAI(env, user, cat, p, system, history, userContent, saved);
      used = p;
      if (reply) break;
    } catch (e) {
      lastErr = e;
      console.error('provider failed', e.provider || p, e.status, e.detail || e.message);
    }
  }
  if (!used) throw new HttpError(503, 'agent_busy', 'Chuyên gia đang bận, bạn thử lại sau ít phút nhé.');
  if (!reply) reply = 'Mình chưa trả lời được câu này, bạn thử hỏi lại ngắn gọn hơn nhé.';

  const t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO messages (id,cat_id,user_id,role,content,created_at) VALUES (?,?,?,?,?,?)').bind(uid(), cat.id, user.id, 'user', text, t),
    env.DB.prepare('INSERT INTO messages (id,cat_id,user_id,role,content,created_at) VALUES (?,?,?,?,?,?)').bind(uid(), cat.id, user.id, 'assistant', reply, t + 1),
  ]);
  return json({ reply, provider: used, savedObservations: saved, callsLeft: Math.max(0, limit(env) - calls - 1) });
}
