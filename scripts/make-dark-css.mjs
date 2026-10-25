// 어두운 화면(prefers-color-scheme: dark) CSS를 각 사이트의 밝은 CSS에서 자동으로 만든다.
// 밝은 배경 → 어두운 배경, 어두운 글자 → 밝은 글자, 밝은 테두리 → 어두운 테두리로 같은 선택자에 덮어쓴다.
// 진한 색 배경(파란 버튼·남색 상자 등)과 그 위 글자는 그대로 둔다(같은 규칙 안에 진한 배경이 있으면 글자색을 건드리지 않음).
// CSS를 고친 뒤에는 다시 실행: node scripts/make-dark-css.mjs  (결과 파일은 직접 고치지 않는다)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAIRS = [['packages/ui/src/styles.css', 'packages/ui/src/dark.css']];
for (const app of fs.readdirSync(path.join(ROOT, 'apps'))) {
  const src = `apps/${app}/app/${app}.css`;
  if (fs.existsSync(path.join(ROOT, src))) PAIRS.push([src, `apps/${app}/app/${app}.dark.css`]);
}

const NAMED = { white: '#ffffff', black: '#000000' };
const hex = (c) => {
  c = NAMED[c.toLowerCase()] ?? c;
  let h = c.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return { r, g, b, a: h.length === 8 ? h.slice(6) : '' };
};
const hsl = ({ r, g, b }) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l };
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s, l };
};
const toHex = ({ h, s, l }) => {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:white|black)\b/g;
const light = (c) => hsl(hex(c)).l;

// 역할별 바꾸기. 반환 null이면 그대로 둠.
// 흰색·회색 배경은 남색이 살짝 도는 어두운 색, 색이 있는 연한 배경(연파랑·연노랑 등)은 같은 색의 어두운 색.
const asBg = (c) => { const x = hsl(hex(c)); if (x.l < 0.8) return null; const neutral = x.s < 0.12; return toHex({ h: neutral ? 0.61 : x.h, s: neutral ? 0.28 : x.s * 0.45, l: Math.min(0.2, 0.08 + (1 - x.l) * 0.55) }) + hex(c).a; };
// 회색 글자는 밝은 회색, 색 있는 글자(초록·주황 등)는 같은 색을 밝게.
const asText = (c) => { const x = hsl(hex(c)); if (x.l >= 0.25 && x.l < 0.42 && x.s > 0.3) return toHex({ h: x.h, s: Math.min(1, x.s), l: 0.72 }); if (x.l < 0.42) return toHex({ h: x.h, s: x.s * 0.35, l: 0.9 - x.l * 0.35 }); if (x.l < 0.62 && x.s > 0.25) return toHex({ h: x.h, s: Math.min(1, x.s), l: 0.68 }); if (x.l < 0.62) return toHex({ h: x.h, s: x.s, l: 0.7 }); return null; };
const asLine = (c) => { const x = hsl(hex(c)); if (x.l < 0.78) return null; return toHex({ h: x.h, s: x.s * 0.4, l: 0.24 }); };

const BG = /^(background|background-color)$/, TEXT = /^(color)$/, LINE = /^(border|border-(top|right|bottom|left)|border(-\w+)?-color|outline-color)$/;

function mapDecl(prop, val, keepText) {
  prop = prop.trim().toLowerCase();
  let fn = null;
  if (prop.startsWith('--')) {
    // 변수: 밝은 값은 배경·선, 어두운 값은 글자로 본다. 중간 색(포인트 색)은 그대로.
    const m = val.match(COLOR); if (!m || m.length !== 1 || val.trim() !== m[0]) return null;
    const x = hsl(hex(m[0]));  // 진한 강조색(초록·파랑 변수)은 그대로, 아주 어두운 색(본문 글자)·흐린 회색(보조 글자)은 밝게, 'line' 변수는 선 색
    fn = x.l >= 0.8 ? (/line/.test(prop) ? asLine : asBg) : x.l < 0.25 || (x.l < 0.62 && x.s < 0.3) ? asText : null;
    if (!fn) return null;
  } else if (BG.test(prop)) fn = asBg;
  else if (TEXT.test(prop)) { if (keepText) return null; fn = asText; }
  else if (LINE.test(prop)) fn = asLine;
  else return null;
  let changed = false;
  const out = val.replace(COLOR, (c) => { if (/^#[0-9a-f]{8}$/i.test(c) && !BG.test(prop)) return c; const r = fn(c); if (r && r.toLowerCase() !== c.toLowerCase()) { changed = true; return r; } return c; });
  return changed ? `${prop}:${out}` : null;
}

// 아주 단순한 CSS 파서: 규칙과 @media 묶음(한 단계)만. 주석은 지운다.
function parse(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const items = []; let i = 0;
  const block = (start) => { let d = 0, j = start; for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}') { d--; if (d === 0) break; } } return j; };
  while (i < css.length) {
    const o = css.indexOf('{', i); if (o < 0) break;
    const head = css.slice(i, o).split(';').pop().trim(); const c = block(o);  // @import ...; 뒤의 선택자만
    const body = css.slice(o + 1, c);
    if (head.startsWith('@media') && head.includes('prefers-color-scheme')) { /* 손으로 쓴 어두운 화면 규칙은 건너뜀 */ }
    else if (head.startsWith('@media')) items.push({ media: head.slice(6).trim(), rules: parse(body) });
    else if (!head.startsWith('@')) items.push({ sel: head, body });
    i = c + 1;
  }
  return items;
}

function darkRule(r) {
  const decls = r.body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const k = d.indexOf(':'); return [d.slice(0, k), d.slice(k + 1)]; });
  // 같은 규칙에 진한(유지되는) 배경이 있으면 그 위 글자색은 그대로.
  const keepText = decls.some(([p, v]) => BG.test(p.trim()) && (v.match(COLOR) ?? []).some((c) => light(c) < 0.8 && !/^#[0-9a-f]{8}$/i.test(c)));
  const out = decls.map(([p, v]) => mapDecl(p, v, keepText)).filter(Boolean);
  return out.length ? `${r.sel}{${out.join(';')}}` : '';
}

for (const [src, dst] of PAIRS) {
  const items = parse(fs.readFileSync(path.join(ROOT, src), 'utf8'));
  const lines = [];
  const plain = items.filter((x) => x.sel).map(darkRule).filter(Boolean);
  if (plain.length) lines.push(`@media (prefers-color-scheme:dark){${plain.join('')}}`);
  for (const m of items.filter((x) => x.media)) {
    const rules = m.rules.filter((x) => x.sel).map(darkRule).filter(Boolean);
    if (rules.length) lines.push(`@media (prefers-color-scheme:dark) and ${m.media.replace(/^screen and /, '')}{${rules.join('')}}`);
  }
  const head = `/* 자동 생성: node scripts/make-dark-css.mjs — ${src}의 어두운 화면. 직접 고치지 말 것. */\n`;
  fs.writeFileSync(path.join(ROOT, dst), head + lines.join('\n') + '\n');
  console.log(dst, lines.join('').length, 'bytes');
}
