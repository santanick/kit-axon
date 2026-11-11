/* v36 수료증 디자인 키트(스튜디오 · 학습자 공용) — 대표님(2026-11-09): '수료증은 디자인 타입을 5개로 늘려주고, 사용자가 직접 수료증 이미지를 업로드하여 수정할 수 있게'.
   디자인: a 클래식 · b 모던(기존 렌더러 그대로) · c 미니멀 · d 공식 문서 · e 컬러 띠 + img(올린 이미지를 바탕으로, 글자 위치를 % 좌표로).
   CERTK.html(T, d)는 <style>을 함께 넣어 돌려준다 → 미리보기 · 인쇄 · 파일 내려받기(스튜디오 · 학습자) 어디서나 같은 모습.
   T: { design, title, body, org, rep, logo, seal, fields, showDate, showNo, bg, bgR(세로/가로 비), pos{ key:{x,y,s,c,b,al,on} } }
   d: { name, cls, period, hours, at, no } */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NEW = ['c', 'd', 'e', 'img'];
  const LIST = [
    ['a', '클래식', '금색 이중 테두리'], ['b', '모던', '위아래 색 띠'], ['c', '미니멀', '넓은 여백 · 얇은 선'],
    ['d', '공식 문서', '격식 있는 테두리 문양'], ['e', '컬러 띠', '왼쪽 색 띠 · 배지']];
  /* 이미지 바탕의 글자 칸(기본 위치는 가로형 A4 기준) */
  const KEYS = [['title', '제목'], ['no', '발급번호'], ['name', '성명'], ['cls', '과정명'], ['period', '교육기간'], ['hours', '교육시간'], ['body', '본문'], ['at', '발급일'], ['org', '기관 · 대표']];
  const POS0 = { title: { x: 50, y: 20, s: 40, b: 1 }, no: { x: 12, y: 8, s: 12, al: 'l' }, name: { x: 50, y: 38, s: 26, b: 1 }, cls: { x: 50, y: 48, s: 16 }, period: { x: 50, y: 54, s: 13 }, hours: { x: 50, y: 59, s: 13 },
    body: { x: 50, y: 68, s: 14 }, at: { x: 50, y: 80, s: 14 }, org: { x: 50, y: 88, s: 18, b: 1 } };
  const pos = T => { const P = Object.assign({}, (T && T.pos) || {}); KEYS.forEach(([k]) => { P[k] = Object.assign({}, POS0[k], P[k] || {}); }); return P; };
  /* v38 교육시간: 값이 없으면 그 구절을 통째로 빼고, 있으면 'n시간'(본문 '(…, 시간)' 빈 칸 방지) */ const hrs = (s0, h) => { let s = String(s0 || '').replace(/\{교육시간\}\s*시간/g, '{교육시간}'); const v = String(h == null ? '' : h).trim(); if (v && +v !== 0) return s.replace(/\{교육시간\}/g, /시간$/.test(v) ? v : v + '시간'); return s.replace(/\(\s*\{교육시간\}\s*\)/g, '').replace(/\(\s*([^()]*?)\s*,\s*\{교육시간\}\s*\)/g, '($1)').replace(/\(\s*\{교육시간\}\s*,\s*([^()]*?)\s*\)/g, '($1)').replace(/\s*,\s*\{교육시간\}/g, '').replace(/\{교육시간\}\s*,\s*/g, '').replace(/\s*\{교육시간\}/g, '').replace(/\(\s*\)/g, ''); };
  const fill = (s, d) => hrs(s, d.hours).replace(/\{(이름|과정명|교육기간|교육시간|발급일|발급번호)\}/g, (_, k) => String({ 이름: d.name, 과정명: d.cls, 교육기간: d.period, 교육시간: d.hours, 발급일: d.at, 발급번호: d.no }[k] ?? ''));
  const CSS = `.ck{box-sizing:border-box;position:relative;width:760px;max-width:100%;margin:0 auto;background:#fff;color:#1F2020;font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;text-align:center;word-break:keep-all;overflow-wrap:anywhere}
.ck *{box-sizing:border-box}.ck .ck-en{display:block;letter-spacing:.32em;font-size:11px;color:#8A8F99;margin-bottom:6px}.ck h2{margin:0}.ck dl{display:grid;grid-template-columns:96px 1fr;gap:6px 14px;text-align:left;max-width:420px;margin:0 auto 18px;font-size:15px}.ck dt{color:#6C6C6C}.ck dd{margin:0;font-weight:600}
.ck .ck-body{line-height:1.85;font-size:15px;margin:0 auto 18px;max-width:520px}.ck .ck-date{margin:0 0 10px;font-size:15px}.ck .ck-sg{margin:0;font-size:18px;font-weight:700}.ck .ck-seal{height:52px;vertical-align:middle;margin-left:6px}.ck .ck-seal0{display:inline-grid;place-items:center;width:46px;height:46px;border:2px solid #C8322F;color:#C8322F;border-radius:6px;font-size:18px;vertical-align:middle;margin-left:8px}.ck .ck-logo{max-height:52px;max-width:180px;display:block;margin:0 auto 10px}.ck .ck-no{position:absolute;left:28px;top:20px;margin:0;font-size:12px;color:#6C6C6C}
.ck.c{padding:64px 72px 56px;text-align:left;border:1px solid #E1E3E6}.ck.c::before{content:'';position:absolute;left:72px;right:72px;top:40px;border-top:2px solid #1F2020}.ck.c h2{font-size:38px;font-weight:800;letter-spacing:-.02em;margin:18px 0 6px}.ck.c .ck-en{letter-spacing:.2em}.ck.c .ck-nm{font-size:30px;font-weight:800;margin:26px 0 4px;letter-spacing:-.02em}.ck.c dl{margin:14px 0 20px;max-width:none;grid-template-columns:88px 1fr}.ck.c .ck-body{margin:0 0 24px;max-width:none}.ck.c .ck-foot{display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #E1E3E6;padding-top:16px}.ck.c .ck-logo{margin:0 0 6px}.ck.c .ck-no{left:72px;top:16px}
.ck.d{padding:22px;background:#FBF8F1;border:2px solid #6B5A35}.ck.d .ck-in{border:1px solid #6B5A35;outline:6px double #B8A47A;outline-offset:-14px;padding:56px 60px 48px;font-family:'Nanum Myeongjo','Batang','AppleMyungjo',serif}.ck.d h2{font-size:46px;letter-spacing:.5em;margin:10px 0 28px;padding-left:.5em;font-weight:700}.ck.d .ck-en{color:#8A7B55}.ck.d dd{font-weight:700}.ck.d .ck-sg{font-size:20px;letter-spacing:.1em}.ck.d .ck-no{left:44px;top:38px}
.ck.e{display:grid;grid-template-columns:120px 1fr;text-align:left;min-height:520px;border:1px solid #E1E3E6}.ck.e .ck-band{background:linear-gradient(180deg,#5C74F6,#3C4FC9);position:relative}.ck.e .ck-medal{position:absolute;left:50%;top:64px;transform:translateX(-50%);width:76px;height:76px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 6px rgba(255,255,255,.28)}.ck.e .ck-medal svg{width:40px;height:40px}.ck.e .ck-main{padding:56px 56px 44px}.ck.e h2{font-size:36px;font-weight:800;letter-spacing:-.01em;color:#2E40B3;margin:4px 0 22px}.ck.e .ck-nm{font-size:28px;font-weight:800;margin:0 0 14px;padding-bottom:12px;border-bottom:2px solid #E7EAFE}.ck.e dl{margin:0 0 18px;max-width:none}.ck.e .ck-body{margin:0 0 22px;max-width:none}.ck.e .ck-no{position:static;margin:0 0 4px}.ck.e .ck-logo{margin:0 0 14px}
.ck.img{padding:0;background:#fff center/100% 100% no-repeat}.ck.img .ck-f{position:absolute;transform:translate(-50%,-50%);white-space:pre-line;line-height:1.5;max-width:86%}.ck.img .ck-f.l{transform:translate(0,-50%);text-align:left}.ck.img .ck-f.r{transform:translate(-100%,-50%);text-align:right}.ck.img .ck-f.b{font-weight:700}.ck.img .ck-f.sel{outline:2px dashed #E5487A;outline-offset:3px;background:rgba(229,72,122,.06)}.ck.img.ed .ck-f{cursor:move;touch-action:none}
@media print{.ck{box-shadow:none;margin:0}}`;
  const medal = '<svg viewBox="0 0 24 24" fill="none" stroke="#3C4FC9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/><path d="m9.6 9 1.6 1.6L14.6 7.3"/></svg>';
  function rows(T, d) { const F = T.fields || {}; const r = (on, k, v) => on && v ? `<dt>${k}</dt><dd>${E(v)}</dd>` : '';
    return r(F.cls !== false, '과정명', d.cls) + r(F.period !== false, '교육기간', d.period) + r(F.hours !== false, '교육시간', d.hours ? d.hours + '시간' : ''); }
  const sign = T => `<p class="ck-sg">${E(T.org || '')}${T.rep ? ` 대표 ${E(T.rep)}` : ''}${T.seal ? `<img class="ck-seal" src="${E(T.seal)}" alt="직인">` : '<span class="ck-seal0" aria-hidden="true">印</span>'}</p>`;
  const body = (T, d) => E(fill(T.body || '위 사람은 「{과정명}」 과정을 성실히 이수하였기에 이 증서를 드립니다.', d)).replace(/\n/g, '<br>');
  function inner(T, d, opt) { const F = T.fields || {}; const no = T.showNo !== false && d.no ? `<p class="ck-no">제 ${E(d.no)} 호</p>` : ''; const date = T.showDate !== false ? `<p class="ck-date">${E(d.at)}</p>` : '';
    const nm = F.name !== false ? d.name : ''; const logo = T.logo ? `<img class="ck-logo" src="${E(T.logo)}" alt="기관 로고">` : '';
    const ttl = E(T.title || '수 료 증');
    if (T.design === 'c') return `<div class="ck c">${no}${logo}<span class="ck-en">CERTIFICATE OF COMPLETION</span><h2>${ttl}</h2>${nm ? `<p class="ck-nm">${E(nm)}</p>` : ''}<dl>${rows(T, d)}</dl><p class="ck-body">${body(T, d)}</p><div class="ck-foot">${date || '<span></span>'}${sign(T)}</div></div>`;
    if (T.design === 'd') return `<div class="ck d"><div class="ck-in">${no}${logo}<span class="ck-en">CERTIFICATE</span><h2>${ttl}</h2><dl>${nm ? `<dt>성명</dt><dd>${E(nm)}</dd>` : ''}${rows(T, d)}</dl><p class="ck-body">${body(T, d)}</p>${date}${sign(T)}</div></div>`;
    if (T.design === 'e') return `<div class="ck e"><div class="ck-band"><span class="ck-medal">${medal}</span></div><div class="ck-main">${logo}${no}<span class="ck-en" style="text-align:left">CERTIFICATE OF COMPLETION</span><h2>${ttl}</h2>${nm ? `<p class="ck-nm">${E(nm)}</p>` : ''}<dl>${rows(T, d)}</dl><p class="ck-body">${body(T, d)}</p>${date}${sign(T)}</div></div>`;
    if (T.design === 'img') { const P = pos(T); const R = +T.bgR > 0 ? +T.bgR : 0.7071;
      const txt = { title: T.title || '수 료 증', no: T.showNo !== false && d.no ? `제 ${d.no} 호` : '', name: nm, cls: F.cls !== false ? d.cls : '', period: F.period !== false && d.period ? `교육기간 ${d.period}` : '', hours: F.hours !== false && d.hours ? `교육시간 ${d.hours}시간` : '',
        body: fill(T.body || '위 사람은 「{과정명}」 과정을 성실히 이수하였기에 이 증서를 드립니다.', d), at: T.showDate !== false ? d.at : '', org: [T.org || '', T.rep ? '대표 ' + T.rep : ''].filter(Boolean).join(' ') };
      const f = KEYS.map(([k]) => { const p = P[k]; if (p.on === false || !txt[k]) return ''; return `<span class="ck-f ${p.al === 'l' ? 'l' : p.al === 'r' ? 'r' : ''} ${p.b ? 'b' : ''}" data-ck="${k}" style="left:${+p.x}%;top:${+p.y}%;font-size:${(+p.s || 14) / 7.6}cqw;${p.c ? `color:${E(p.c)};` : ''}">${E(txt[k])}</span>`; }).join('');
      return `<div class="ck img ${opt && opt.edit ? 'ed' : ''}" style="aspect-ratio:${(1 / R).toFixed(4)};container-type:inline-size;${T.bg ? `background-image:url('${E(T.bg)}')` : 'background:#F5F2EA'}">${f}</div>`; }
    return ''; }
  /* 기존 렌더러를 쓰는 a · b는 null(호출한 쪽이 기존 것을 쓴다) */
  function html(T, d, opt) { if (!T || !NEW.includes(T.design)) return null; return `<style>${CSS}</style>${inner(T, d || {}, opt)}`; }
  /* 학습자 사이트(learner.html — lassess.js 뒤에서 읽음): 새 디자인이면 이 렌더러로 */
  if (typeof window.a2lCertHTML === 'function') { const base = window.a2lCertHTML; window.a2lCertHTML = (T, d) => html(T, d) || base(T, d); }
  window.CERTK = { LIST, NEW, KEYS, POS0, pos, html, CSS, isNew: k => NEW.includes(k), label: k => (LIST.find(x => x[0] === k) || [k, k === 'img' ? '내 이미지' : k])[1] };
})();
