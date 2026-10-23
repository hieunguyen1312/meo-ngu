// Body-language reading from photos / video frames.
// Images are only forwarded to the model; the Worker never stores them.
import { CONTEXTS, FELINE_FIVE, KNOWLEDGE, MOODS } from './knowledge.js';

export const MAX_IMAGES = 4;
export const MAX_IMAGE_CHARS = 700 * 1024; // one base64 data URL (~520 KB JPEG)
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const PERSONA = {
  nung: 'mèo nũng nịu, đáng yêu, xưng "con" gọi chủ là "sen"',
  hoang: 'hoàng thượng kiêu kỳ, xưng "trẫm" gọi chủ là "ngươi"',
  dao: 'giang hồ cộc cằn nhưng tốt bụng, xưng "tao" gọi chủ là "mày", không chửi tục',
};
const PARTS = ['Tai', 'Mắt', 'Đuôi', 'Tư thế', 'Lông', 'Ria', 'Miệng', 'Khác'];

export function checkImages(list) {
  if (!Array.isArray(list) || !list.length) return 'Chưa có ảnh nào.';
  if (list.length > MAX_IMAGES) return `Tối đa ${MAX_IMAGES} ảnh mỗi lần.`;
  for (const u of list) {
    if (typeof u !== 'string' || u.length > MAX_IMAGE_CHARS || !DATA_URL.test(u)) return 'Ảnh không hợp lệ hoặc quá lớn.';
  }
  return null;
}

export function visionPrompt(cat, persona, isVideo, ownerNote) {
  const body = (KNOWLEDGE.split('## Ngôn ngữ cơ thể')[1] || '').split('##')[0].trim();
  return `Bạn là chuyên gia hành vi mèo của ứng dụng Mèo Ngữ. Bạn được xem ${isVideo ? 'các khung hình liên tiếp lấy từ CÙNG MỘT video' : 'ảnh'} của bé mèo tên "${cat.name}"${cat.breed ? ' (giống ' + cat.breed + ')' : ''}. Nhiệm vụ: đọc ngôn ngữ cơ thể để đoán bé đang cảm thấy gì và muốn gì, rồi hướng dẫn chủ đáp lại.

Nguyên tắc:
- Chỉ mô tả điều THẤY được trong ảnh. Bộ phận bị che, mờ hoặc ngoài khung thì bỏ qua, đừng đoán.
- Một ảnh tĩnh chứa ít thông tin; khi tín hiệu mâu thuẫn hoặc ít, hạ doTinCay (dưới 50) và nói rõ.
- Bối cảnh xung quanh (bát ăn, cửa, đồ chơi, mèo khác, người) giúp đoán ngữ cảnh.
- Không chẩn đoán bệnh. Chỉ điền canhBao khi thấy dấu hiệu nên đi thú y (thở há miệng, nằm co ro bất thường, chảy dịch mắt/mũi, vết thương, rặn ở khay cát, mắt nhắm một bên, gầy rộc...).
- Gợi ý tính cách chỉ khi ảnh cho thấy rõ; một lần chụp không đủ để kết luận tính cách, nên tối đa 2 gợi ý, thường để mảng rỗng.
${ownerNote ? `- Chủ kể thêm: "${ownerNote}". Dùng thông tin này, nhưng nếu ảnh mâu thuẫn thì tin ảnh.\n` : ''}
Kiến thức ngôn ngữ cơ thể:
${body}

Trả về DUY NHẤT một object JSON hợp lệ (không markdown, không giải thích ngoài JSON), đúng các khoá sau:
{
 "coMeo": true|false,                       // có thấy mèo trong ảnh không
 "chatLuongAnh": "tot"|"tam"|"kem",          // kem = quá tối/mờ/xa để đọc
 "tinHieu": [{"phan": ${PARTS.map(p => `"${p}"`).join('|')}, "thay": "điều thấy, ngắn", "yNghia": "ý nghĩa, ngắn"}],   // 2-6 mục
 "camXuc": ${Object.keys(MOODS).map(k => `"${k}"`).join('|')},
 "nguCanh": ${Object.keys(CONTEXTS).map(k => `"${k}"`).join('|')},
 "doTinCay": 0-100,
 "tomTat": "1-2 câu tiếng Việt: bé đang thế nào và có thể muốn gì",
 "loiMeo": "một câu bé 'nói' với chủ, giọng ${PERSONA[persona] || PERSONA.nung}, tối đa 20 chữ",
 "nenLam": ["việc chủ nên làm ngay, cụ thể"],      // 1-4 mục
 "tranhLam": ["việc nên tránh"],                    // 0-3 mục
 "canhBao": null hoặc "dấu hiệu cần thú y, ngắn",
 "goiYTinhCach": [{"net": ${Object.keys(FELINE_FIVE).map(k => `"${k}"`).join('|')}, "huong": "cao"|"thap", "lyDo": "ngắn"}]
}
Mã nguCanh: ${Object.entries(CONTEXTS).map(([k, v]) => `${k}=${v}`).join('; ')}.
Mã camXuc: ${Object.entries(MOODS).map(([k, v]) => `${k}=${v}`).join('; ')}.`;
}

const s = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const arr = (v, n, f) => Array.isArray(v) ? v.map(f).filter(Boolean).slice(0, n) : [];

// Pull the JSON object out of a model reply and keep only known, bounded fields.
export function parseVision(text) {
  if (typeof text !== 'string') return null;
  let t = text.replace(/```(?:json)?/gi, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let o; try { o = JSON.parse(t.slice(a, b + 1)); } catch { return null; }
  if (!o || typeof o !== 'object') return null;
  const r = {
    coMeo: o.coMeo !== false,
    chatLuongAnh: ['tot', 'tam', 'kem'].includes(o.chatLuongAnh) ? o.chatLuongAnh : 'tam',
    tinHieu: arr(o.tinHieu, 6, x => x && typeof x === 'object' && s(x.thay, 120) ? { phan: PARTS.includes(x.phan) ? x.phan : 'Khác', thay: s(x.thay, 120), yNghia: s(x.yNghia, 120) } : null),
    camXuc: MOODS[o.camXuc] ? o.camXuc : 'khong_ro',
    nguCanh: CONTEXTS[o.nguCanh] ? o.nguCanh : 'khac',
    doTinCay: Math.max(0, Math.min(90, Math.round(Number(o.doTinCay) || 0))),
    tomTat: s(o.tomTat, 300),
    loiMeo: s(o.loiMeo, 160),
    nenLam: arr(o.nenLam, 4, x => s(x, 160)),
    tranhLam: arr(o.tranhLam, 3, x => s(x, 160)),
    canhBao: s(o.canhBao, 200) || null,
    goiYTinhCach: arr(o.goiYTinhCach, 2, x => x && FELINE_FIVE[x.net] && ['cao', 'thap'].includes(x.huong) ? { net: x.net, huong: x.huong, lyDo: s(x.lyDo, 120) } : null),
  };
  if (r.coMeo && !r.tomTat) return null;
  return r;
}

export function observationText(r, isVideo) {
  const sig = r.tinHieu.map(x => `${x.phan}: ${x.thay}`).join('; ');
  return `[${isVideo ? 'Video' : 'Ảnh'}, AI đọc] ${MOODS[r.camXuc]}, ngữ cảnh: ${CONTEXTS[r.nguCanh]} (${r.doTinCay}%). ${r.tomTat}${sig ? ' Tín hiệu: ' + sig + '.' : ''}${r.canhBao ? ' Cảnh báo: ' + r.canhBao : ''}`.slice(0, 1000);
}

// ---- providers ----
const openAIContent = (text, images) => [{ type: 'text', text }, ...images.map(url => ({ type: 'image_url', image_url: { url } }))];

export async function callVision(env, provider, system, userText, images) {
  if (provider === 'gemini') {
    const r = await fetch((env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai') + '/chat/completions', {
      method: 'POST', headers: { authorization: 'Bearer ' + env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.GEMINI_VISION_MODEL || env.GEMINI_MODEL || 'gemini-3.1-flash-lite', max_tokens: 2048,
        messages: [{ role: 'system', content: system }, { role: 'user', content: openAIContent(userText, images) }] }),
    });
    if (!r.ok) throw new Error('gemini ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const d = await r.json();
    return d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  }
  if (provider === 'workersai') {
    const d = await env.AI.run(env.WORKERS_AI_VISION_MODEL || env.WORKERS_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it', {
      messages: [{ role: 'system', content: system }, { role: 'user', content: openAIContent(userText, images) }], max_tokens: 4096,
    });
    const c = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
    const out = c != null ? c : d && d.response;
    return Array.isArray(out) ? out.map(x => x.text || '').join('') : typeof out === 'object' && out ? JSON.stringify(out) : out;
  }
  if (provider === 'anthropic') {
    const content = [...images.map(u => { const [h, data] = u.split(','); return { type: 'image', source: { type: 'base64', media_type: h.slice(5, h.indexOf(';')), data } }; }), { type: 'text', text: userText }];
    const r = await fetch((env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
      method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.AGENT_MODEL || 'claude-haiku-5-5', max_tokens: 1500, system, messages: [{ role: 'user', content }] }),
    });
    if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const d = await r.json();
    return (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  }
  throw new Error('unknown provider ' + provider);
}
