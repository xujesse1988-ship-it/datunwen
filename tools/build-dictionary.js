'use strict';
/* 大同语词典构建器：读 ../lexicon.json 与 ../datunwen.html（复用其 CSS 与字形/发音引擎），
   生成自足的 ../dictionary.html。词库增长后重跑：node tools/build-dictionary.js */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'lexicon.json'), 'utf8'));
const ref = fs.readFileSync(path.join(ROOT, 'datunwen.html'), 'utf8');
const entries = lex.entries;

/* —— 1. 复用设计书的全部 CSS —— */
const css = [...ref.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');

/* —— 2. 提取引擎并替换词库表 —— */
let eng = ref.match(/<script>([\s\S]*?)<\/script>/)[1];
const zhShort = e => String(e.zh).split(/[，,；;（(·]/)[0].trim();
const lexObj = {}, compObj = {}, partObj = {}, wgObj = {};
for (const e of entries) {
  if (e.kind === 'root' || e.kind === 'pronoun') lexObj[e.f] = { g: zhShort(e), c: e.cls || null };
  else if (e.kind === 'comp') { compObj[e.f] = e.parts; wgObj[e.f] = zhShort(e); }
  else if (e.kind === 'particle') partObj[e.f] = zhShort(e);
}
eng = eng.replace(/const LEX = \{[\s\S]*?\n\};/, 'const LEX = ' + JSON.stringify(lexObj) + ';');
eng = eng.replace(/const COMP = \{[\s\S]*?\n\};/, 'const COMP = ' + JSON.stringify(compObj) + ';');
eng = eng.replace(/const PART = \{[\s\S]*?\n\};/, 'const PART = ' + JSON.stringify(partObj) + ';');
eng = eng.replace(/const WG = \{[\s\S]*?\n\};/, 'const WG = ' + JSON.stringify(wgObj) + ';');

/* —— 3. parseWord 打词素编号补丁（多音节词根整体满格渲染） —— */
const NEW_PW = `function parseWord(raw) {
  const w = { raw, contour: 'ref', units: [], particle: false };
  let tok = raw;
  let mIdx = 0;
  if (PART[tok] !== undefined) {
    w.particle = true; w.contour = 'low';
    const syls = syllabify(tok, false);
    if (!syls) return null;
    syls.forEach(s => w.units.push({ syl: s, cls: null, name: false, m: 0 }));
    return w;
  }
  const mm = /^(.+?)([qz])$/.exec(tok);
  if (mm) { tok = mm[1]; w.contour = mm[2] === 'q' ? 'pred' : 'attr'; }
  for (const seg of tok.split('-')) {
    if (!seg) return null;
    if (/^[A-Z]/.test(seg)) {
      const syls = syllabify(seg.toLowerCase());
      if (!syls) return null;
      syls.forEach(s => { w.units.push({ syl: s, cls: null, name: true, m: mIdx }); mIdx++; });
    } else {
      const morphs = COMP[seg] ? COMP[seg] : (LEX[seg] ? [seg] : null);
      if (morphs) {
        for (const mo of morphs) {
          const syls = syllabify(mo, PART[mo] === undefined);
          if (!syls) return null;
          syls.forEach((s, i) => w.units.push({ syl: s, cls: i === 0 ? ((LEX[mo] || {}).c || null) : null, name: false, m: mIdx }));
          mIdx++;
        }
      } else {
        const syls = syllabify(seg);
        if (!syls) return null;
        syls.forEach(s => w.units.push({ syl: s, cls: null, name: false, m: mIdx }));
        mIdx++;
      }
    }
  }
  return w.units.length ? w : null;
}
`;
const pwA = eng.indexOf('function parseWord(raw) {');
const pwB = eng.indexOf('\nfunction gloss');
if (pwA < 0 || pwB < 0) throw new Error('parseWord anchor not found');
eng = eng.slice(0, pwA) + NEW_PW + eng.slice(pwB + 1);
const OLD_SCALE = 'const s = w.particle ? 0.58 : (u.name ? 1 : (i === n - 1 ? 1 : 0.74));';
if (!eng.includes(OLD_SCALE)) throw new Error('scale anchor not found');
eng = eng.replace(OLD_SCALE,
  'const lastM = w.units[w.units.length - 1].m; const s = w.particle ? 0.58 : (u.name ? 1 : (u.m === lastM ? 1 : 0.74));');

/* —— 4. 词典专用 CSS —— */
const dictCss = `
.searchbar { position: sticky; top: 42px; z-index: 40; background: var(--paper); padding: 12px 0 10px; border-bottom: 1px solid var(--hairline); }
.searchbar input { width: 100%; box-sizing: border-box; font-family: var(--mono); font-size: 15px; padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--hairline2); background: var(--panel); color: var(--ink); }
.searchbar input:focus { outline: none; border-color: var(--dian); }
.chips button.on { color: var(--paper); background: var(--dian); border-color: var(--dian); }
.badges { display: flex; gap: 8px; margin: 12px 0 4px; font-family: var(--sans); font-size: 12.5px; flex-wrap: wrap; }
.bigbdg { background: var(--panel); border: 1px solid var(--hairline); border-radius: 100px; padding: 4px 13px; color: var(--ink-2); }
.bigbdg b { color: var(--ink); }
.drow { display: flex; gap: 16px; padding: 13px 8px; border-bottom: 1px solid var(--hairline); scroll-margin-top: 120px; }
.drow:target { background: var(--dian-soft); border-radius: 10px; }
.drow .dg { flex: none; width: 96px; display: flex; justify-content: center; align-items: flex-start; }
.dmain { flex: 1; min-width: 0; }
.dhead { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; font-family: var(--sans); }
.drom { font-family: var(--mono); font-weight: 700; color: var(--dian); font-size: 16.5px; }
.dipa { font-family: var(--mono); color: var(--ink-3); font-size: 12.5px; }
.bdg { font-size: 10.5px; letter-spacing: .07em; padding: 2px 8px; border-radius: 100px; border: 1px solid var(--hairline2); color: var(--ink-2); white-space: nowrap; }
.bdg.canon { color: var(--zhu); border-color: var(--zhu); }
.bdg.numb { color: var(--dian); border-color: var(--dian); }
.dgl { font-size: 15.5px; margin: 3px 0 1px; }
.dgl .zh { margin-left: 10px; color: var(--ink); }
.dety { font-family: var(--sans); font-size: 12.5px; color: var(--ink-2); line-height: 1.65; }
.dforms { display: flex; gap: 6px; margin-top: 7px; flex-wrap: wrap; }
.cbtn { font-family: var(--mono); font-size: 12px; cursor: pointer; color: var(--dian); background: transparent; border: 1px solid var(--hairline2); border-radius: 100px; padding: 3px 11px; }
.cbtn:hover, .cbtn:focus-visible { border-color: var(--dian); outline: none; }
.cbtn small { color: var(--ink-3); font-family: var(--sans); margin-left: 4px; }
.ixd { margin: 26px 0; background: var(--panel); border: 1px solid var(--hairline); border-radius: 12px; padding: 12px 18px; }
.ixd summary { cursor: pointer; font-family: var(--sans); font-weight: 700; font-size: 14.5px; }
.ixgrid { columns: 3 230px; column-gap: 26px; padding: 10px 0 4px; }
.ixa { display: block; font-family: var(--sans); font-size: 13px; padding: 2.5px 0; color: var(--ink-2); break-inside: avoid; }
.ixa:hover { color: var(--ink); text-decoration: none; }
.ixa .rm { font-family: var(--mono); color: var(--dian); margin-left: 7px; font-weight: 600; }
@media (max-width: 560px) { .drow .dg { width: 64px; } }
`;

/* —— 5. 页面脚本（词条渲染 / 搜索 / 双向索引） —— */
const pageJs = [
'const DICT = ' + JSON.stringify(entries) + ';',
"const KINDZH = { root: '词根', pronoun: '代词', particle: '虚词', comp: '复合' };",
"const CLSZH = { mind: '义符·心', matter: '义符·物', life: '义符·生', time: '义符·时', social: '义符·众', speech: '义符·言', animal: '义符·兽' };",
"function ipa(f) { return '/' + f.replace(/c/g, 't\\u0361\\u0283').replace(/x/g, '\\u0283').replace(/y/g, 'j').replace(/[rl]/g, '\\u027e') + '/'; }",
"function etyLine(e) {",
"  if (e.kind === 'comp') {",
"    const tree = e.parts.map(p => p + '\\u2009' + ((LEX[p] && LEX[p].g) || PART[p] || '?')).join(' ＋ ');",
"    return '〔' + tree + '〕' + (e.just ? '　—— ' + e.just : '') + (e.anchor ? '　·虚词锚定型' : '');",
"  }",
"  const bits = [];",
"  if (e.srcEN) bits.push(e.srcEN);",
"  if (e.srcZH && e.srcZH !== e.srcEN) bits.push(e.srcZH);",
"  return bits.join('　·　');",
"}",
"const dictEl = qs('#dict');",
"for (const e of DICT) {",
"  const row = document.createElement('div');",
"  row.className = 'drow'; row.id = 'e-' + e.f;",
"  row.dataset.k = e.kind; row.dataset.num = e.num ? '1' : '';",
"  row.dataset.s = (e.f + ' ' + e.en + ' ' + e.zh).toLowerCase();",
"  const g = document.createElement('div'); g.className = 'dg';",
"  const wb = wordButton(e.f, e.kind === 'particle' ? 34 : 46);",
"  if (wb) { const r = wb.querySelector('.r'); if (r) r.remove(); const gg = wb.querySelector('.g'); if (gg) gg.remove(); g.appendChild(wb); }",
"  row.appendChild(g);",
"  const main = document.createElement('div'); main.className = 'dmain';",
"  let badges = '<span class=\"bdg\">' + KINDZH[e.kind] + '</span>';",
"  badges += '<span class=\"bdg ' + (e.layer === 'canon' ? 'canon' : '') + '\">' + (e.layer === 'canon' ? '正典' : '草案 v0.2') + '</span>';",
"  if (e.num) badges += '<span class=\"bdg numb\">数词</span>';",
"  if (e.cls) badges += '<span class=\"bdg\">' + CLSZH[e.cls] + '</span>';",
"  let h = '<div class=\"dhead\"><span class=\"drom\">' + e.f + '</span><span class=\"dipa\">' + ipa(e.f) + '</span>' + badges + '</div>';",
"  h += '<div class=\"dgl\"><b>' + e.en + '</b><span class=\"zh\">' + e.zh + '</span></div>';",
"  h += '<div class=\"dety\">' + etyLine(e) + '</div>';",
"  if (e.kind !== 'particle') {",
"    h += '<div class=\"dforms\">';",
"    h += '<button class=\"cbtn\" data-w=\"' + e.f + '\">' + e.f + '<small>指称·平</small></button>';",
"    h += '<button class=\"cbtn\" data-w=\"' + e.f + 'q\">' + e.f + 'q<small>谓述·降</small></button>';",
"    h += '<button class=\"cbtn\" data-w=\"' + e.f + 'z\">' + e.f + 'z<small>修饰·升</small></button>';",
"    h += '</div>';",
"  }",
"  main.innerHTML = h; row.appendChild(main); dictEl.appendChild(row);",
"}",
"document.addEventListener('click', function (ev) {",
"  const b = ev.target.closest('.cbtn');",
"  if (b) playWord(b.dataset.w, null);",
"});",
"const rows = qsa('.drow');",
"let kf = 'all';",
"function applyFilter() {",
"  const q = qs('#q').value.trim().toLowerCase();",
"  let shown = 0;",
"  for (const r of rows) {",
"    const okK = kf === 'all' || (kf === 'num' ? r.dataset.num === '1' : (kf === 'root' ? (r.dataset.k === 'root' || r.dataset.k === 'pronoun') : r.dataset.k === kf));",
"    const okQ = !q || r.dataset.s.indexOf(q) >= 0;",
"    const on = okK && okQ; r.style.display = on ? '' : 'none'; if (on) shown++;",
"  }",
"  qs('#shownN').textContent = shown;",
"}",
"qs('#q').addEventListener('input', applyFilter);",
"qsa('#kchips button').forEach(function (b) {",
"  b.addEventListener('click', function () {",
"    kf = b.dataset.k;",
"    qsa('#kchips button').forEach(function (x) { x.classList.toggle('on', x === b); });",
"    applyFilter();",
"  });",
"});",
"function mkIndex(el, keyFn, sortFn) {",
"  const items = DICT.slice().sort(sortFn);",
"  el.innerHTML = items.map(function (e) {",
"    return '<a class=\"ixa\" href=\"#e-' + e.f + '\"><b>' + keyFn(e) + '</b><span class=\"rm\">' + e.f + '</span></a>';",
"  }).join('');",
"  el.addEventListener('click', function () { qs('#q').value = ''; kf = 'all'; qsa('#kchips button').forEach(function (x) { x.classList.toggle('on', x.dataset.k === 'all'); }); applyFilter(); });",
"}",
"mkIndex(qs('#idxEN'), function (e) { return e.en; }, function (a, b) { return a.en.toLowerCase() < b.en.toLowerCase() ? -1 : 1; });",
"var zhColl; try { zhColl = new Intl.Collator('zh-Hans-CN-u-co-pinyin'); } catch (err) { zhColl = { compare: function (a, b) { return a < b ? -1 : 1; } }; }",
"mkIndex(qs('#idxZH'), function (e) { return e.zh; }, function (a, b) { return zhColl.compare(a.zh, b.zh); });",
"applyFilter();"
].join('\n');

/* —— 6. 组装 —— */
const M = lex.meta;
const html = ['<!DOCTYPE html>',
'<html lang="zh-CN">',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<meta name="description" content="大同语词典 v' + M.version + '：大同语 → English / 中文 三语检索，含字形渲染与合成发音。">',
'<title>大同语词典 · Datunwen Dictionary</title>',
'<style>',
'*, *::before, *::after { box-sizing: border-box; }',
'body { margin: 0; }',
'button { font: inherit; }',
css, dictCss,
'</style>',
'</head>',
'<body>',
'<nav class="topnav"><div class="in">',
'  <span class="name"><span class="seal">大同语</span> 词典 · Dictionary</span>',
'  <a href="datunwen.html">设计书</a><a href="course-en.html">English Course</a><a href="#idxEN-d">EN 索引</a><a href="#idxZH-d">中文索引</a>',
'</div></nav>',
'<div class="wrap">',
'<header class="hero" style="padding:46px 0 10px">',
'  <div class="kicker"><span class="seal">词 典</span> DICTIONARY · v' + M.version + ' · ' + M.date + '</div>',
'  <h1 style="font-size:clamp(26px,3.6vw,38px)">大同语词典 <span class="lat">Datunwen Dictionary</span></h1>',
'  <p class="sub">大同语 → English · 中文。每个词条的字块与三姿态变体均可点击发音（浏览器内合成）。</p>',
'  <div class="badges">',
'    <span class="bigbdg">共 <b>' + M.counts.total + '</b> 条</span>',
'    <span class="bigbdg">正典 <b>' + M.counts.canon + '</b></span>',
'    <span class="bigbdg">扩充草案 <b>' + M.counts.draft + '</b></span>',
'    <span class="bigbdg">词根 <b>' + (M.counts.roots + M.counts.pronouns) + '</b> · 复合 <b>' + M.counts.compounds + '</b> · 虚词 <b>' + M.counts.particles + '</b></span>',
'    <span class="bigbdg">当前显示 <b id="shownN">0</b></span>',
'  </div>',
'  <div class="notecard"><span class="t">草案声明 · Draft notice</span>',
'    <p>标「正典」的 62 条出自设计书本体。标「草案 v0.2」的 ' + M.counts.draft + ' 条为多 agent 分域起草、经全局机械校验（音系合法性 · 全表唯一性 · 最小对防火墙 · 复合分解）并由主设计裁决合并的<strong>扩充提案</strong>，尚待使用检验。The 62 “canon” entries come from the design book; “v0.2-draft” entries are machine-drafted, mechanically validated proposals awaiting field testing.</p></div>',
'</header>',
'<div class="searchbar">',
'  <input id="q" type="search" spellcheck="false" placeholder="搜索 search：罗马字 / English / 中文 …">',
'  <div class="chips" id="kchips" style="margin-top:9px">',
'    <button data-k="all" class="on">全部</button><button data-k="root">词根·代词</button><button data-k="comp">复合词</button><button data-k="particle">虚词</button><button data-k="num">数词</button>',
'  </div>',
'</div>',
'<div id="dict"></div>',
'<details class="ixd" id="idxEN-d"><summary>English → Datunwen 索引</summary><div class="ixgrid" id="idxEN"></div></details>',
'<details class="ixd" id="idxZH-d"><summary>中文 → 大同语 索引</summary><div class="ixgrid" id="idxZH"></div></details>',
'<div class="footer"><p><span class="seal">跋</span>本词典由 tools/build-dictionary.js 自 lexicon.json（机读词库）程序化生成；字形与发音引擎复用自 datunwen.html。扩充层词形经三个并行 agent 起草、五重全局校验与人工裁决合并（v0.2，' + M.date + '）。发音为规则合成的示意音。</p></div>',
'</div>',
'<div class="tip" id="tip" role="status"></div>',
'<script>',
eng,
pageJs,
'</script>',
'</body>',
'</html>'].join('\n');

fs.writeFileSync(path.join(ROOT, 'dictionary.html'), html);
console.log('dictionary.html written:', Buffer.byteLength(html), 'bytes;', entries.length, 'entries');
