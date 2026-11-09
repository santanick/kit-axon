/* v36 A — 교육과정 화면 개선(대표님 2026-11-09 운영 v35.5 피드백)
   ① 교육과정 보기(카드)에서 썸네일을 누르면 그 과정의 운영현황(수강 인원 · 진도 · 이수 · 미접속 · 할 일)을 오른쪽 창으로 바로(목록 보기는 그대로)
   ② 이수 현황 엑셀(.xlsx — UTF-8 XML이라 한글이 깨지지 않음): 과정별 · 전체. 기관 유형별 열(대학은 학번 · 학과만, 이름 없음)
   ③ 출결: 회차 클래스의 출석부와 함께 기간 클래스 등 모든 과정의 진도율 화면
   ④ 수료증: 디자인 5종(certkit.js) + 내 이미지를 바탕으로 올리고 글자 위치를 끌어서 고치기(미리보기)
   ⑤ 카테고리: 과정 상세 · 과정 만들기에서 바로 고르고 새로 만들기, 카테고리 화면에서 한 번에 넣기 · 빼기, 추천 카테고리 · 자동 분류
   기능 id(go · ACT)는 바꾸지 않고 감싸서 확장한다. 로드 시 S는 null — 모든 동작은 함수 안에서. */
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof ACT === 'undefined') return;
  const A = v => Array.isArray(v) ? v : [];
  const U = () => S && S.org && S.org.type === 'univ';
  const I = (k, s = 18) => (typeof ic === 'function' ? ic(k in IC ? k : 'grid', s) : '');
  const AWAY = 14; /* 이 날수 이상 접속하지 않으면 '미접속' */
  const done = (c, id) => { if (A(S.certs).some(x => x.cls === c.id && x.who === id)) return true; /* 수료증이 나간 사람은 이수 */ try { if (typeof a2IsDone === 'function') return a2IsDone(c, id); } catch (e) { } return ((c.prog[id] || {}).p || 0) >= ((c.criteria || {}).threshold || 80); };
  const certOf = (c, id) => A(S.certs).find(x => x.cls === c.id && x.who === id);
  const lastOf = id => (M(id) || {}).last || '';
  const away = id => { const l = lastOf(id); return !l || daysAgo(l) >= AWAY; };
  const pOf = (c, id) => +((c.prog || {})[id] || {}).p || 0;
  const grpName = id => { const m = M(id) || {}; try { if (typeof c2TName === 'function') { const n = c2TName(m.team || m.group); if (n) return n; } } catch (e) { } return ((S.groups || []).find(g => g.id === m.group) || {}).name || ''; };
  /* 기관 유형별 식별 열 — 대학은 학번 · 학과만(이름을 내보내지 않는다) */
  function idCols() { const ty = S.org.type;
    if (ty === 'univ') return [['학번', m => (m.extra || {}).학번 || m.sid || ''], ['학과', m => (m.extra || {}).학과 || grpName(m.id)]];
    if (ty === 'corp') return [['이름', m => m.name || m.nick || ''], ['부서', m => (m.extra || {}).부서 || grpName(m.id)], ['직급', m => (m.extra || {}).직급 || '']];
    if (ty === 'voc') return [['이름', m => m.name || m.nick || ''], ['훈련생 구분', m => (m.extra || {}).훈련생구분 || ''], [t('group'), m => grpName(m.id)]];
    return [['이름', m => m.name || m.nick || ''], [t('group'), m => grpName(m.id)]]; }
  const whoLabel = id => { const m = M(id) || { id }; return U() ? [(m.extra || {}).학번 || m.sid || '', (m.extra || {}).학과 || grpName(id)].filter(Boolean).join(' · ') : (m.name || m.nick || '—'); };
  window.OPS36 = { done, away, whoLabel };

  /* ═════════ 엑셀(.xlsx) 쓰기 — 압축 없는 ZIP + SpreadsheetML ═════════ */
  const CRC = (() => { const T = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; } return b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }; })();
  function zip(files) { const enc = new TextEncoder(); const parts = [], cen = []; let off = 0;
    const d = new Date(); const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(([name, text]) => { const nb = enc.encode(name), db = enc.encode(text), crc = CRC(db);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nb, db);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, db.length, true); c.setUint32(24, db.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + db.length; });
    const csz = cen.reduce((a, b) => a + b.length, 0); const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); }
  const X = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colL = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  function sheetXml(cols, rows) { const all = [cols, ...rows]; const W = cols.map((h, j) => Math.min(48, Math.max(8, ...all.slice(0, 300).map(r => { const v = String(r[j] == null ? '' : r[j]); return [...v].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? 2 : 1), 0) + 2; }))));
    const cell = (v, r, j, hd) => { const ref = colL(j) + r; if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${hd ? ' s="1"' : ''}><v>${v}</v></c>`; if (v == null || v === '') return ''; return `<c r="${ref}" t="inlineStr"${hd ? ' s="1"' : ''}><is><t xml:space="preserve">${X(v)}</t></is></c>`; };
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${W.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${all.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => cell(v, i + 1, j, i === 0)).join('')}</row>`).join('')}</sheetData>${rows.length ? `<autoFilter ref="A1:${colL(cols.length - 1)}${rows.length + 1}"/>` : ''}</worksheet>`; }
  function xlsx(name, sheets) { const sn = s => String(s).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Sheet';
    const used = new Set(); const SH = sheets.map((s, i) => { let n = sn(s.name); while (used.has(n)) n = (n.slice(0, 28) + ' ' + (i + 1)); used.add(n); return { ...s, name: n }; });
    const NS = 'http://schemas.openxmlformats.org/'; const files = [
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${SH.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets>${SH.map((s, i) => `<sheet name="${X(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}package/2006/relationships">${SH.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${SH.length + 1}" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEF1FE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
      ...SH.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.cols, s.rows)])];
    const b = zip(files); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name.replace(/[\\/:*?"<>|]/g, '_'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return b; }
  window.XLSX36 = { xlsx, zip, sheetXml };

  /* ═════════ 이수 현황 데이터 ═════════ */
  const kindName = c => c.kind === 'pack' ? '과정 묶음' : (KIND[c.kind] || '기간') + (c.sub ? ' · ' + c.sub : '');
  const per = c => { try { return typeof c2Period === 'function' ? c2Period(c) : `${c.start || ''} ~ ${c.end || ''}`; } catch (e) { return `${c.start || ''} ~ ${c.end || ''}`; } };
  const catName = c => { try { return typeof c2CatName === 'function' ? c2CatName(c.cat) : ''; } catch (e) { return ''; } };
  const hasAtt = c => c.kind === 'episode' || S.org.type === 'voc';
  function sumOf(c) { const L = A(c.learners); const n = L.length; const dn = L.filter(id => done(c, id)).length; const avg = n ? Math.round(L.reduce((a, id) => a + pOf(c, id), 0) / n) : 0;
    return { n, dn, rate: n ? Math.round(dn / n * 100) : 0, avg, away: L.filter(away).length, zero: L.filter(id => !pOf(c, id)).length, low: L.filter(id => pOf(c, id) < 30).length,
      grade: L.filter(id => ((c.prog[id] || {}).assign) === 'submitted').length, noCert: L.filter(id => done(c, id) && !certOf(c, id)).length }; }
  const SUMCOLS = () => [t('cls'), '유형', '카테고리', '운영 상태', '수강 기간', '수강 인원', `${t('done')} 인원`, `${t('done')}율(%)`, '평균 진도(%)', `${AWAY}일 이상 미접속`, '아직 시작 안 함'];
  const sumRow = c => { const s = sumOf(c); return [c.name, kindName(c), catName(c), c.status || '', per(c), s.n, s.dn, s.rate, s.avg, s.away, s.zero]; };
  const LCOLS = (withCls) => [...(withCls ? [t('cls')] : []), ...idCols().map(x => x[0]), '진도율(%)', '시험 점수', '과제', ...(withCls ? ['출석률(%)'] : []), '최근 접속', `${t('done')} 여부`, `${t('done')}일`, '수료증 번호'];
  function lRow(c, id, withCls) { const m = M(id) || { id, extra: {} }; const p = c.prog[id] || {}; const ct = certOf(c, id);
    return [...(withCls ? [c.name] : []), ...idCols().map(x => x[1](m)), pOf(c, id), p.exam == null ? '' : +p.exam, { none: '미제출', submitted: '채점 대기', graded: '채점 완료' }[p.assign] || '',
      ...(withCls ? [hasAtt(c) && p.att != null ? +p.att : ''] : []), lastOf(id), done(c, id) ? t('done') : '미' + t('done'), ct ? ct.at : '', ct ? ct.no : '']; }
  function clsLCols(c) { const L = LCOLS(false); if (hasAtt(c)) L.splice(L.indexOf('과제') + 1, 0, '출석률(%)'); return L; }
  function clsLRow(c, id) { const r = lRow(c, id, false); if (hasAtt(c)) { const p = c.prog[id] || {}; r.splice(clsLCols(c).indexOf('출석률(%)'), 0, p.att == null ? '' : +p.att); } return r; }
  function xlsClass(c) { if (!c) return; try { if (typeof c2Ensure === 'function') c2Ensure(c); } catch (e) { }
    xlsx(`${c.name}_${t('done')}현황_${today()}.xlsx`, [{ name: '요약', cols: SUMCOLS(), rows: [sumRow(c)] }, { name: `${t('done')} 현황`, cols: clsLCols(c), rows: A(c.learners).map(id => clsLRow(c, id)) }]);
    logAudit(`${c.name} ${t('done')} 현황 엑셀 내려받기`); toast(`「${c.name}」 ${t('done')} 현황 엑셀을 내려받았습니다.`, 'ok'); }
  function xlsAll() { const CL = visCls(); try { if (typeof c2EnsureAll === 'function') c2EnsureAll(); } catch (e) { }
    xlsx(`전체_${t('done')}현황_${today()}.xlsx`, [{ name: `${t('cls')}별 요약`, cols: SUMCOLS(), rows: CL.map(sumRow) }, { name: '전체 명단', cols: LCOLS(true), rows: CL.flatMap(c => A(c.learners).map(id => lRow(c, id, true))) }]);
    logAudit(`전체 ${t('done')} 현황 엑셀 내려받기`); toast(`전체 ${t('done')} 현황 엑셀(${t('cls')}별 요약 · 전체 명단)을 내려받았습니다.`, 'ok'); }
  const visCls = () => { const tc = S.me.role === 'teacher' && typeof tMe === 'function' && tMe() ? tMe().classes || [] : null; return S.classes.filter(c => !tc || tc.includes(c.id)); };
  window.OPS36.xlsClass = xlsClass; window.OPS36.xlsAll = xlsAll; window.OPS36.sum = sumOf;
  ACT['ops-xls'] = el => { const v = el && el.dataset && el.dataset.v; if (v && C(v)) xlsClass(C(v)); else xlsAll(); };
  const xlsBtn = (v, l) => `<button type="button" class="btn ops-xbtn" data-act="ops-xls" data-v="${esc(v || '')}">${I('download', 16)} ${esc(l || `${t('done')} 현황 엑셀`)}</button>`;
  window.OPS36.xlsBtn = xlsBtn;
  /* 기존 '수강현황 내려받기'(CSV, 열 이름과 값이 어긋나던 것)는 같은 버튼에서 엑셀로 */
  ACT['cls-dl'] = el => xlsClass(C(el.dataset.v));

  /* ═════════ 독려 알림(실제 전달이 연동되지 않았으면 '등록') ═════════ */
  function nudge(c, ids, why) { ids = A(ids); if (!ids.length) { toast('대상이 없습니다.', 'warn'); return; }
    if (typeof menuOn === 'function' && menuOn('message') && typeof cmCommSnap === 'function') { slClose && slClose(); UI.msgTo = 'mem:' + ids.join(','); go('message'); toast(`${why} ${ids.length}명을 받는 사람으로 넣었습니다.`, 'ok'); return; }
    const tt = `「${c.name}」 학습을 이어가 보세요`, bd = `${S.org.name}입니다. 「${c.name}」 진도가 남아 있어요. 오늘 한 차시만 이어서 들어 보세요.`;
    (typeof c2ov === 'function' ? c2ov : modal)(`${why} ${ids.length}명 독려`, `<label class="fl">제목<input name="t" maxlength="60" value="${esc(tt)}"></label><label class="fl">내용<textarea name="b" rows="4" maxlength="1000">${esc(bd)}</textarea></label>`,
      [{ id: 'c', label: '취소' }, { id: 'ok', label: '알림 등록', kind: 'pri', run: w => { const a = w.querySelector('[name=t]').value.trim(), b = w.querySelector('[name=b]').value.trim(); if (!a || !b) return false;
        ids.forEach(id => { if (typeof c2Notify === 'function') c2Notify(id, a, b); }); (S.msgs = S.msgs || []).unshift({ id: uid('ms'), at: today(), to: `${c.name} · ${why}`, toIds: ids.slice(), parents: false, title: a, body: b, imgs: [], ch: '알림함', n: ids.length });
        logAudit(`${c.name} ${why} 독려 ${ids.length}명`); save(); toast(`${ids.length}명에게 알림을 등록했습니다.`, 'ok'); } }]); }

  /* ═════════ ① 운영현황(썸네일을 누르면) ═════════ */
  function opsHTML(c) { const s = sumOf(c); const L = A(c.learners); const dd = c.end ? Math.round((new Date(c.end) - new Date(today())) / 864e5) : null;
    const rec = c.recruit && c.recruit.on && c.recruit.to ? Math.round((new Date(c.recruit.to) - new Date(today())) / 864e5) : null;
    const todo = [];
    if (s.grade) todo.push(['check', `채점 대기 ${s.grade}건`, '제출된 과제를 채점합니다', 'ops-go', `${c.id}|eval`, '채점하기']);
    if (s.noCert) todo.push(['badge' in IC ? 'badge' : 'check', `${t('done')}했지만 수료증 미발급 ${s.noCert}명`, '기준을 채운 사람에게 수료증을 줍니다', 'ops-cert', c.id, '발급하기']);
    if (s.away) todo.push(['bell' in IC ? 'bell' : 'send', `${AWAY}일 이상 미접속 ${s.away}명`, '다시 들어오도록 안내합니다', 'ops-nudge', `${c.id}|away`, '독려']);
    if (s.low - s.zero > 0) todo.push(['chart', `진도 30% 미만 ${s.low - s.zero}명`, '늦어진 사람에게 안내합니다', 'ops-nudge', `${c.id}|low`, '독려']);
    if (s.zero) todo.push(['book', `아직 시작 안 함 ${s.zero}명`, '첫 차시를 안내합니다', 'ops-nudge', `${c.id}|zero`, '독려']);
    if (dd != null && dd >= 0 && dd <= 14 && s.n - s.dn > 0) todo.push(['calendar' in IC ? 'calendar' : 'chart', `종료 D-${dd} · 미${t('done')} ${s.n - s.dn}명`, `${c.end} 종료 전에 마치도록`, 'ops-nudge', `${c.id}|undone`, '독려']);
    if (rec != null && rec >= 0 && rec <= 7) todo.push(['users', `수강 신청 마감 D-${rec}`, `${c.recruit.to}까지 · 지금 ${s.n}명`, 'ops-go', `${c.id}|set`, '설정']);
    if (c.status === '준비중') todo.push(['globe', '아직 준비중입니다', `${t('learner')}에게 보이려면 운영을 시작하세요`, 'ops-go', `${c.id}|set`, '설정']);
    const tile = (k, v, u, sub, tone) => `<div class="ops-t ${tone || ''}"><small>${esc(k)}</small><b>${esc(String(v))}<i>${esc(u)}</i></b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
    const lows = L.slice().sort((a, b) => pOf(c, a) - pOf(c, b)).slice(0, 5);
    return `<div class="ops">
      <div class="ops-hd">${c.thumb ? `<img src="${esc(c.thumb)}" alt="">` : `<span class="ops-th0">${esc([...String(c.name || '?')][0])}</span>`}<div><b>${esc(c.name)}</b><small>${esc([kindName(c), c.status, per(c)].filter(Boolean).join(' · '))}</small></div></div>
      <div class="ops-ts">${tile('수강 인원', s.n, '명', c.recruit && c.recruit.cap ? `정원 ${c.recruit.cap}명` : '')}${tile('평균 진도', s.avg, '%', '')}${tile(t('done'), s.dn, '명', `${t('done')}율 ${s.rate}%`, 'g')}${tile('미접속', s.away, '명', `${AWAY}일 이상`, s.away ? 'w' : '')}${tile('할 일', todo.length, '건', '', todo.length ? 'p' : '')}</div>
      <div class="ops-bar" role="img" aria-label="${t('done')} ${s.dn}명 · 진행 ${s.n - s.dn - s.zero}명 · 시작 전 ${s.zero}명"><i class="g" style="width:${s.n ? s.dn / s.n * 100 : 0}%"></i><i class="b" style="width:${s.n ? (s.n - s.dn - s.zero) / s.n * 100 : 0}%"></i></div>
      <p class="ops-lg"><span class="g">${t('done')} ${s.dn}</span><span class="b">진행 ${Math.max(0, s.n - s.dn - s.zero)}</span><span>시작 전 ${s.zero}</span></p>
      <h3 class="sl-gh">할 일</h3>${todo.length ? `<div class="ops-todo">${todo.map(([icn, a, b, act, v, l]) => `<div class="ops-tr"><span class="ops-ti">${I(icn, 18)}</span><span class="ops-tx"><b>${esc(a)}</b><small>${esc(b)}</small></span><button type="button" class="btn sm" data-act="${act}" data-v="${esc(v)}">${esc(l)}</button></div>`).join('')}</div>` : `<p class="ops-none">지금 처리할 일이 없습니다.</p>`}
      ${L.length ? `<h3 class="sl-gh">진도가 낮은 ${esc(t('learner'))}</h3><div class="ops-low">${lows.map(id => `<div class="ops-lr"><span>${esc(whoLabel(id))}</span><span class="ops-pb"><i style="width:${pOf(c, id)}%"></i></span><b>${pOf(c, id)}%</b><small>${lastOf(id) ? (daysAgo(lastOf(id)) ? daysAgo(lastOf(id)) + '일 전' : '오늘') : '접속 없음'}</small></div>`).join('')}</div>` : `<p class="ops-none">아직 ${esc(tj('learner', '이'))} 없습니다.</p>`}
    </div>`; }
  const opsFoot = c => `<button type="button" class="btn pri" data-act="ops-go" data-v="${c.id}|learners">관리 화면 열기</button>${xlsBtn(c.id, '엑셀')}`;
  function opsOpen(id) { const c = C(id); if (!c) return; UI.opsC = id; const w = SL.sheet(`운영현황`, opsHTML(c), opsFoot(c)); w.classList.add('ops-w'); return w; }
  ACT['ops-open'] = el => opsOpen(el.dataset.v);
  ACT['ops-go'] = el => { const [id, tab] = String(el.dataset.v).split('|'); if (!C(id)) return; slClose(); UI.cls = id; UI.clsT = tab || 'learners'; UI.slaClsHome = null; go('class'); window.scrollTo(0, 0); };
  ACT['ops-cert'] = el => { const c = C(el.dataset.v); if (!c) return; const ids = A(c.learners).filter(id => done(c, id) && !certOf(c, id)); slClose(); if (typeof a2CertIssueModal === 'function') a2CertIssueModal(c, ids); else { UI.cls = c.id; UI.clsT = 'learners'; go('class'); } };
  ACT['ops-nudge'] = el => { const [id, k] = String(el.dataset.v).split('|'); const c = C(id); if (!c) return; const L = A(c.learners);
    const ids = k === 'away' ? L.filter(away) : k === 'low' ? L.filter(x => pOf(c, x) > 0 && pOf(c, x) < 30) : k === 'zero' ? L.filter(x => !pOf(c, x)) : L.filter(x => !done(c, x));
    nudge(c, ids, { away: `${AWAY}일 이상 미접속`, low: '진도 30% 미만', zero: '시작 전', undone: '미' + t('done') }[k] || ''); };
  /* 시트를 연 채로 데이터가 바뀌면 다시 그린다 */
  AFTER.push(() => { const w = $('#slSheet.ops-w'); if (!w) return; const c = C(UI.opsC); if (!c) return; const b = w.querySelector('.sl-sb'); if (b) b.innerHTML = opsHTML(c); });
  window.OPS36.open = opsOpen;

  /* 카드 보기: 썸네일 = 운영현황 버튼(선택 체크박스는 그대로 위에) · 목록/카드 공통 바에 이수 현황 엑셀 */
  if (typeof c2ListView === 'function') { const base = c2ListView; c2ListView = (...a) => { let h = base(...a); try {
    h = h.replace(/<article class="d26-cc"><div class="d26-th">([\s\S]*?)(<label class="d26-ck"><input type="checkbox" class="c2ck" value="([^"]+)")/g, (m0, pre, lab, id) => { const c = C(id); return `<article class="d26-cc"><div class="d26-th">${pre}<button type="button" class="ops-thb" data-act="ops-open" data-v="${esc(id)}" aria-label="${esc(c ? c.name : '')} 운영현황 보기"><span>${I('chart', 16)} 운영현황</span></button>${lab}`; });
    if (!/data-act="ops-xls"/.test(h)) h = h.replace(/(<span class="d26-view")/, `${xlsBtn('', `전체 ${t('done')} 현황 엑셀`)}$1`);
  } catch (e) { console.error(e); } return h; }; }

  /* 과정 상세: '수강현황 내려받기' → '이수 현황 엑셀', 카테고리 칩 = 바로 고르기 */
  { const base = VIEWS.class; VIEWS.class = (...a) => { let h = base(...a); try { if (UI.cls && C(UI.cls)) {
    h = h.replace(/(data-act="cls-dl"[^>]*>)[^<]*/, `$1${t('done')} 현황 엑셀`);
    /* 수료증 양식(설정 탭): 5종 + 내 이미지 */
    h = h.replace(/(<select data-chg="a2-cls-cert"[^>]*>[\s\S]*?)(<\/select>)/, (m0, pre, end) => { const c = C(UI.cls); const T = c.certTpl || {}; const add = ['c', 'd', 'e', 'img'].map(k => `<option value="${k}" ${T.use === 'custom' && T.design === k ? 'selected' : ''}>이 ${esc(t('cls'))} 전용 · ${esc(CERTK.label(k))}</option>`).join(''); return pre + add + end; });
    const c = C(UI.cls); if (c && c.certTpl && c.certTpl.use === 'custom' && c.certTpl.design === 'img') h = h.replace(/(data-act="a2-cls-certedit"[^>]*>[^<]*<\/button>)/, `$1 <button class="btn sm" data-act="ck-edit" data-v="${esc(c.id)}">이미지 · 글자 위치</button>`);
  } } catch (e) { console.error(e); } return h; }; }

  /* ═════════ ⑤ 카테고리 ═════════ */
  const catOpts = sel => { const T = typeof c2CatTree === 'function' ? c2CatTree() : []; return T.map(([k, d]) => `<option value="${esc(k.id)}" ${k.id === sel ? 'selected' : ''}>${d ? '— ' : ''}${esc(k.name)}</option>`).join(''); };
  const SUGGEST = { adult: ['업무 자동화', '오피스 · 엑셀', 'AI 활용', '자격증', '디자인 · 영상'], k12: ['국어', '영어', '수학', '과학', '특강'], univ: ['교양', '전공', '비교과', '취업 · 진로', 'AI 역량'],
    corp: ['법정의무교육', '직무', '리더십', '신입 입문', 'AI 활용'], public: ['법정의무교육', '직무', '신규 임용', '정책 · 행정', 'AI 활용'], lifelong: ['인문 · 교양', '어학', '취미 · 예술', '자격 · 취업', '디지털'], voc: ['국가기간 · 전략산업', '일반 직종', '재직자 과정', '자격 대비', '취업 준비'] };
  const KW = { '업무 자동화': /자동화|노션|업무|생산성/, '오피스 · 엑셀': /엑셀|오피스|파워포인트|한글|컴활|워드/, 'AI 활용': /AI|인공지능|생성형|챗GPT|GPT|프롬프트/, '자격증': /자격|컴활|기사|필기|실기|시험/, '디자인 · 영상': /디자인|영상|사진|편집|포토샵/,
    '국어': /국어|문학|독서|논술/, '영어': /영어|English|토익|회화/, '수학': /수학|미적|확률|기하/, '과학': /과학|물리|화학|생명|지구/, '특강': /특강|캠프|방학/,
    '교양': /교양|글쓰기|철학|역사/, '전공': /전공|공학|이론|원론/, '비교과': /비교과|프로그램|특강|캠프/, '취업 · 진로': /취업|진로|면접|자소서|커리어/, 'AI 역량': /AI|인공지능|데이터|코딩|생성형/,
    '법정의무교육': /법정|의무|성희롱|폭력|개인정보|안전|장애인|청렴|반부패/, '직무': /직무|실무|역량|엑셀|보고서/, '리더십': /리더|관리자|코칭/, '신입 입문': /신입|입문|온보딩|오리엔테이션/, '신규 임용': /신규|임용/, '정책 · 행정': /행정|정책|민원|적극/,
    '인문 · 교양': /인문|교양|역사|철학/, '어학': /어학|영어|일본어|중국어/, '취미 · 예술': /취미|예술|미술|음악|원데이|공예/, '자격 · 취업': /자격|취업/, '디지털': /디지털|스마트폰|AI|컴퓨터|코딩/,
    '국가기간 · 전략산업': /국가기간|전략|스마트|제조|용접|전기/, '일반 직종': /일반|사무|회계/, '재직자 과정': /재직/, '자격 대비': /자격|필기|실기/, '취업 준비': /취업|면접/ };
  function catPickHTML(sel) { return `<div class="ops-cat"><select class="ops-catsel" aria-label="카테고리"><option value="">카테고리 없음</option>${catOpts(sel)}<option value="__new">+ 새 카테고리 만들기…</option></select><input class="ops-catnew" maxlength="30" placeholder="새 카테고리 이름" hidden aria-label="새 카테고리 이름"></div>`; }
  /* 과정 상세의 '카테고리' 칩 → 시트에서 바로 고르기 · 새로 만들기 */
  ACT['d26-cat'] = () => { const c = C(UI.cls); if (!c) return; try { c2EnsureAll(); } catch (e) { }
    const T = typeof c2CatTree === 'function' ? c2CatTree() : [];
    const w = SL.sheet('카테고리', `<p class="ops-one">고른 카테고리는 학습자 사이트 ${esc(t('cls'))} 목록의 분류 탭이 됩니다.</p>` + SL.list([SL.row({ act: 'ops-catset', v: '', name: '카테고리 없음', icon: I('grid', 18), col: '#AAABAB', right: !c.cat ? '<span class="sl-ok">✓</span>' : '' }),
      ...T.map(([k, d]) => SL.row({ act: 'ops-catset', v: k.id, name: (d ? '└ ' : '') + k.name, sub: `${S.classes.filter(x => x.cat === k.id).length}개`, icon: I('grid', 18), col: d ? '#7C5CF2' : '#5C74F6', right: c.cat === k.id ? '<span class="sl-ok">✓</span>' : '' }))]) +
      `<div class="ops-catadd"><input id="opsCatN" maxlength="30" placeholder="새 카테고리 이름" aria-label="새 카테고리 이름"><button type="button" class="btn pri" data-act="ops-catadd">만들고 넣기</button></div>` +
      (!T.length ? `<div class="ops-sug"><small>추천</small>${A(SUGGEST[S.org.type] || SUGGEST.adult).map(n => `<button type="button" class="chip" data-act="ops-catadd" data-v="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : ''),
      `<button type="button" class="btn ghost" data-act="ops-catmgr">카테고리 관리</button>`); w.dataset.ops = 'cat'; };
  ACT['ops-catset'] = el => { const c = C(UI.cls); if (!c) return; c.cat = el.dataset.v || ''; logAudit(`${c.name} 카테고리 — ${c.cat ? c2CatName(c.cat) : '없음'}`); save(); slClose(); render(); toast(c.cat ? `「${c2CatName(c.cat)}」에 넣었습니다.` : '카테고리를 뺐습니다.', 'ok'); };
  ACT['ops-catadd'] = el => { const nm = (el.dataset.v || ($('#opsCatN') || {}).value || '').trim(); if (!nm) { toast('카테고리 이름을 입력하세요.', 'warn'); return; } const ex = A(S.cats).find(k => k.name === nm && !k.parent); const k = ex || (typeof c2AddCat === 'function' ? c2AddCat(nm, '') : null); if (!k) return;
    const c = C(UI.cls); if (c && UI.cls && CUR.tab === 'class') { c.cat = k.id; save(); slClose(); render(); toast(`「${nm}」을(를) 만들고 넣었습니다.`, 'ok'); } };
  ACT['ops-catmgr'] = () => { slClose(); UI.cls = null; UI.clsView = 'cats'; go('class'); };
  /* 과정 만들기 흐름(crs-flow — B 담당 파일은 고치지 않고 CF 이벤트로): 마지막(개설) 단계에 카테고리 고르기, 만들 때 넣기 */
  function cfHook() { if (!window.CF || typeof CF.on !== 'function' || CF._ops36) return; CF._ops36 = 1;
    CF.on('step', x => { try { if (!x || !x.d) return; const last = x.i === x.n - 1; if (!last) return; const b = document.querySelector('#crsFlow .cf-body'); if (!b || b.querySelector('.ops-cfcat')) return;
      try { c2EnsureAll(); } catch (e) { } const d = x.d; const box = document.createElement('section'); box.className = 'ops-cfcat'; box.innerHTML = `<label class="cf-lb">카테고리 <small>학습자 사이트 분류 탭</small></label>${catPickHTML(d.catPick || '')}`;
      const hd = [...b.querySelectorAll('h2,h3,h4,.cf-h,.cf-sub,b,strong')].find(e => /이렇게 보입니다/.test(e.textContent)); if (hd) hd.before(box); else b.prepend(box); const s = box.querySelector('select'), inp = box.querySelector('input');
      s.addEventListener('change', () => { if (s.value === '__new') { inp.hidden = false; inp.focus(); return; } inp.hidden = true; d.catPick = s.value; });
      const mk = () => { const v = inp.value.trim(); if (!v) return; const ex = A(S.cats).find(k => k.name === v && !k.parent); const k = ex || c2AddCat(v, ''); if (!k) return; d.catPick = k.id; s.innerHTML = `<option value="">카테고리 없음</option>${catOpts(k.id)}<option value="__new">+ 새 카테고리 만들기…</option>`; inp.value = ''; inp.hidden = true; toast(`「${v}」 카테고리를 만들었습니다.`, 'ok'); };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); mk(); } }); inp.addEventListener('blur', mk); } catch (e) { console.error(e); } });
    CF.on('create', x => { try { if (x && x.course && x.d && x.d.catPick && A(S.cats).some(k => k.id === x.d.catPick)) { x.course.cat = x.d.catPick; save(); } } catch (e) { } }); }
  cfHook(); setTimeout(cfHook, 0);

  /* 카테고리 화면: 하는 일 한 줄 · 이 카테고리의 과정 [빼기] · 넣을 과정 [+ 넣기] 한 번에 · 추천 카테고리 · 자동 분류 */
  if (typeof c2CatsView === 'function') { c2CatsView = function () { try { c2EnsureAll(); } catch (e) { }
    const T = c2CatTree(); const sel = UI.catSel && S.cats.find(k => k.id === UI.catSel) ? UI.catSel : (T[0] && T[0][0].id) || ''; const k = S.cats.find(x => x.id === sel);
    const ids = k ? c2CatIds(k.id) : []; const inCat = k ? S.classes.filter(c => c.cat === k.id) : []; const q = String(UI.opsCatQ || '').trim().toLowerCase();
    const rest = k ? S.classes.filter(c => c.cat !== k.id && (!q || c.name.toLowerCase().includes(q))) : [];
    const sug = A(SUGGEST[S.org.type] || SUGGEST.adult).filter(n => !S.cats.some(x => x.name === n));
    const head0 = `<button class="link back" data-act="c2-catsback">← ${esc(t('cls'))} 목록</button>` + headD('카테고리', `${esc(t('cls'))}을(를) 분야별로 묶습니다. 학습자 사이트 ${esc(t('cls'))} 목록의 분류 탭으로 바로 보입니다.`, `${T.length ? `<button class="btn" data-act="ops-catauto">${I('spark', 16)} 자동 분류</button>` : ''}<button class="btn pri" data-act="c2-catnew">+ 카테고리</button>`);
    if (!T.length) return head0 + `<div class="card ops-catempty"><b>아직 카테고리가 없습니다</b><p class="mini">추천을 누르면 바로 만들어집니다. 만든 뒤 [자동 분류]로 ${esc(t('cls'))}을(를) 한 번에 넣을 수 있습니다.</p><div class="ops-sug">${A(SUGGEST[S.org.type] || SUGGEST.adult).map(n => `<button type="button" class="chip" data-act="ops-catmk" data-v="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div><button type="button" class="btn pri" data-act="ops-catmkall">추천 카테고리 모두 만들고 자동 분류</button></div>`;
    const row = (c, act, l, cls) => `<div class="ops-cr">${c.thumb ? `<img src="${esc(c.thumb)}" alt="">` : `<span class="ops-th0 sm">${esc([...c.name][0])}</span>`}<span class="ops-tx"><b>${esc(c.name)}</b><small>${esc([kindName(c), c.status, c.cat && c.cat !== (k && k.id) ? '현재: ' + c2CatName(c.cat) : ''].filter(Boolean).join(' · '))}</small></span><button type="button" class="btn sm ${cls || ''}" data-act="${act}" data-v="${c.id}">${esc(l)}</button></div>`;
    return head0 + `<section class="g2c c2cats ops-cats"><div class="card"><div class="ch"><b>카테고리</b><small>${S.cats.length}개</small></div><ol class="cur c2ctl">${T.map(([x, d]) => `<li class="${x.id === sel ? 'on' : ''} ${d ? 'c2sub' : ''}"><a href="#" data-act="c2-catsel" data-v="${x.id}"><b>${esc(x.name)}</b></a><small class="mini">${S.classes.filter(c => c.cat === x.id).length}개</small><span class="sp"></span><button class="btn sm ghost" data-act="c2-catord" data-v="${x.id}" data-d="-1" aria-label="${esc(x.name)} 위로">↑</button><button class="btn sm ghost" data-act="c2-catord" data-v="${x.id}" data-d="1" aria-label="${esc(x.name)} 아래로">↓</button></li>`).join('')}</ol>${sug.length ? `<div class="ops-sug"><small>추천</small>${sug.map(n => `<button type="button" class="chip" data-act="ops-catmk" data-v="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : ''}</div>
      <div class="card">${k ? `<div class="ch"><b>${esc(c2CatName(k.id))}</b><small>${esc(t('cls'))} ${inCat.length}개</small><span class="sp"></span><details class="uxmore uxdots"><summary aria-label="카테고리 더 보기">${I('dots', 16)}</summary><div class="uxpop" role="menu">${!k.parent ? `<button data-act="c2-catnew" data-p="${k.id}">+ 하위 카테고리</button>` : ''}<button data-act="ops-catren" data-v="${k.id}">이름 바꾸기</button><button data-act="c2-catdel" data-v="${k.id}">삭제</button></div></details></div>
        ${inCat.length ? `<div class="ops-crl">${inCat.map(c => row(c, 'ops-catout', '빼기', 'ghost')).join('')}</div>` : `<p class="ops-none">아래에서 [+ 넣기]를 누르면 이 카테고리에 들어갑니다.</p>`}
        <h3 class="sl-gh">넣을 ${esc(t('cls'))}</h3><input type="search" class="ops-q" data-chg="ops-catq" value="${esc(UI.opsCatQ || '')}" placeholder="${esc(t('cls'))} 이름 검색" aria-label="넣을 ${esc(t('cls'))} 검색">
        ${rest.length ? `<div class="ops-crl">${rest.map(c => row(c, 'ops-catin', '+ 넣기', 'pri')).join('')}</div>${rest.length > 1 ? `<button type="button" class="btn ghost" data-act="ops-catinall" data-v="${k.id}">보이는 ${rest.length}개 모두 넣기</button>` : ''}` : `<p class="ops-none">${q ? '검색 결과가 없습니다.' : `모든 ${esc(tj('cls', '이'))} 이 카테고리에 있습니다.`}</p>`}` : '<div class="empty">왼쪽에서 카테고리를 고르세요.</div>'}</div></section>`; }; }
  const catK = () => S.cats.find(x => x.id === UI.catSel) || (c2CatTree()[0] || [])[0];
  ACT['ops-catin'] = el => { const k = catK(); const c = C(el.dataset.v); if (!k || !c) return; c.cat = k.id; logAudit(`카테고리 넣기 — ${k.name} ← ${c.name}`); save(); render(); toast(`「${c.name}」을(를) 「${k.name}」에 넣었습니다.`, 'ok'); };
  ACT['ops-catout'] = el => { const c = C(el.dataset.v); if (!c) return; c.cat = ''; save(); render(); toast(`「${c.name}」을(를) 뺐습니다.`, 'ok'); };
  ACT['ops-catinall'] = el => { const k = S.cats.find(x => x.id === el.dataset.v); if (!k) return; const q = String(UI.opsCatQ || '').trim().toLowerCase(); const L = S.classes.filter(c => c.cat !== k.id && (!q || c.name.toLowerCase().includes(q))); L.forEach(c => c.cat = k.id); logAudit(`카테고리 넣기 — ${k.name} ${L.length}개`); save(); render(); toast(`${L.length}개를 넣었습니다.`, 'ok'); };
  ACT['ops-catq'] = el => { UI.opsCatQ = el.value; render(); setTimeout(() => { const i = $('#main .ops-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); };
  ACT['ops-catren'] = el => { const k = S.cats.find(x => x.id === el.dataset.v); if (!k) return; modal('카테고리 이름 바꾸기', `<label class="fl">이름<input name="n" maxlength="30" value="${esc(k.name)}"></label>`, [{ id: 'c', label: '취소' }, { id: 'ok', label: '저장', kind: 'pri', run: w => { const v = fv(w, 'n').trim(); if (!v) return false; logAudit(`카테고리 이름 변경 — ${k.name} → ${v}`); k.name = v.slice(0, 30); save(); render(); } }]); };
  ACT['ops-catmk'] = el => { const k = c2AddCat(el.dataset.v, ''); if (k) { UI.catSel = k.id; render(); } };
  function autoAssign() { let n = 0; S.classes.forEach(c => { if (c.cat) return; const k = S.cats.find(x => KW[x.name] && KW[x.name].test(c.name + ' ' + (c.goal || ''))); if (k) { c.cat = k.id; n++; } }); return n; }
  ACT['ops-catauto'] = () => { const n = autoAssign(); logAudit(`카테고리 자동 분류 ${n}개`); save(); render(); toast(n ? `${n}개 ${tj('cls', '을')} 이름에 맞는 카테고리에 넣었습니다. 다르면 [빼기]로 고치세요.` : `카테고리가 없는 ${t('cls')} 중 이름으로 분류할 수 있는 것이 없습니다. [+ 넣기]로 직접 넣으세요.`, n ? 'ok' : 'warn'); };
  ACT['ops-catmkall'] = () => { A(SUGGEST[S.org.type] || SUGGEST.adult).forEach(nm => { if (!S.cats.some(k => k.name === nm)) S.cats.push({ id: uid('cat'), name: nm, parent: '', order: S.cats.length }); }); const n = autoAssign(); UI.catSel = (c2CatTree()[0] || [])[0]?.id || ''; logAudit(`추천 카테고리 만들기 · 자동 분류 ${n}개`); save(); render(); toast(`추천 카테고리를 만들고 ${n}개 ${tj('cls', '을')} 넣었습니다.`, 'ok'); };

  /* ═════════ ③ 출결 + 진도율 ═════════ */
  { const base = VIEWS.attend; if (typeof base === 'function') VIEWS.attend = (...a) => { if (!S || !S.org) return base(...a);
    try { W2.all(); } catch (e) { } const unit = c => { try { return W2.hasUnits(c) || S.org.type === 'voc'; } catch (e) { return c.kind === 'episode'; } };
    const all = visCls(); const eps = all.filter(unit); const pick = C(UI.attC) && all.includes(C(UI.attC)) ? C(UI.attC) : eps[0] || all[0];
    if (!pick) return base(...a);
    const opts = `${eps.length ? `<optgroup label="출석부 · 진도율(회차 · 오프라인)">${eps.map(x => `<option value="${x.id}" ${x === pick ? 'selected' : ''}>${esc(x.name)} · ${esc(kindName(x))}</option>`).join('')}</optgroup>` : ''}${all.filter(x => !eps.includes(x)).length ? `<optgroup label="진도율(기간 · 구독 · 묶음)">${all.filter(x => !eps.includes(x)).map(x => `<option value="${x.id}" ${x === pick ? 'selected' : ''}>${esc(x.name)} · ${esc(kindName(x))}</option>`).join('')}</optgroup>` : ''}`;
    let h;
    if (eps.includes(pick)) { const keep = UI.attC; UI.attC = pick.id; h = base(...a); UI.attC = keep;
      h = h.replace(/(<select data-chg="attSel"[^>]*>)[\s\S]*?(<\/select>)/, `$1${opts}$2`); }
    else { let hd = ''; try { const b0 = base(...a); const d = document.createElement('div'); d.innerHTML = b0; const ph = d.querySelector('.ph') || d.firstElementChild; hd = ph ? ph.outerHTML : ''; } catch (e) { }
      h = hd + `<div class="bar2"><select data-chg="attSel" aria-label="${esc(t('cls'))} 선택">${opts}</select><span class="mini">온라인으로 듣는 ${esc(t('cls'))}은(는) 출석 대신 진도율로 관리합니다.</span></div>`; }
    return h + progHTML(pick); }; }
  function progHTML(c) { const L = A(c.learners); const f = UI.opsPF || 'all'; const s = sumOf(c);
    const keep = id => f === 'all' || (f === 'low' && pOf(c, id) < 30) || (f === 'away' && away(id)) || (f === 'done' && done(c, id)) || (f === 'undone' && !done(c, id));
    const R = L.filter(keep).sort((a, b) => pOf(c, a) - pOf(c, b));
    const ep = hasAtt(c); const cols = [...idCols().map(x => x[0]), '진도율', ...(ep ? ['출석률'] : []), '시험', '최근 접속', t('done')];
    const chip = (v, l) => `<button type="button" role="tab" aria-selected="${f === v}" class="${f === v ? 'on' : ''}" data-act="ops-pf" data-v="${v}">${esc(l)}</button>`;
    return `<section class="card ops-prog" aria-labelledby="opsPg"><div class="ch"><b id="opsPg">진도율 — ${esc(c.name)}</b><small>평균 ${s.avg}% · ${esc(t('done'))} ${s.dn}/${s.n}명 · 미접속 ${s.away}명</small><span class="sp"></span>${s.away ? `<button type="button" class="btn sm" data-act="ops-nudge" data-v="${c.id}|away">미접속 독려</button>` : ''}${xlsBtn(c.id, '엑셀')}</div>
      <div class="sl-chips" role="tablist" aria-label="진도율 보기">${chip('all', `전체 ${s.n}`)}${chip('low', `30% 미만 ${s.low}`)}${chip('away', `미접속 ${s.away}`)}${chip('undone', `미${t('done')} ${s.n - s.dn}`)}${chip('done', `${t('done')} ${s.dn}`)}</div>
      ${R.length ? table(cols, R.slice(0, 300).map(id => { const m = M(id) || { id, extra: {} }; const p = c.prog[id] || {}; const pp = pOf(c, id); const l = lastOf(id);
        return [...idCols().map((x, j) => j ? esc(x[1](m)) : `<b>${esc(x[1](m) || '—')}</b>`), `<span class="ops-pb"><i style="width:${pp}%" class="${pp < 30 ? 'r' : ''}"></i></span> ${pp}%`, ...(ep ? [p.att == null ? '—' : pct(p.att)] : []), p.exam == null ? '—' : esc(String(p.exam)),
          l ? `${esc(l.slice(5))}${away(id) ? ` ${tag(daysAgo(l) + '일', 'y')}` : ''}` : tag('없음', 'y'), done(c, id) ? tag(t('done'), 'g') : `<small class="mini">미${esc(t('done'))}</small>`]; })) + (R.length > 300 ? `<p class="mini">${R.length - 300}명 더 있음 — 엑셀로 보세요.</p>` : '') : `<p class="ops-none">${L.length ? '조건에 맞는 사람이 없습니다.' : `아직 ${esc(tj('learner', '이'))} 없습니다.`}</p>`}</section>`; }
  ACT['ops-pf'] = el => { UI.opsPF = el.dataset.v; render(); };

  /* ═════════ ④ 수료증 디자인 5종 + 내 이미지 ═════════ */
  if (typeof a2CertHTML === 'function' && window.CERTK) {
    { const base = a2CertHTML; a2CertHTML = (T, d, opt) => CERTK.html(T, d, opt) || base(T, d); }
    { const base = a2Tpl; a2Tpl = c => { const T = base(c); const o = c && c.certTpl && c.certTpl.use === 'custom' ? c.certTpl : null; if (o) ['bg', 'bgR', 'pos'].forEach(k => { if (o[k] != null) T[k] = o[k]; }); return T; }; }
    if (typeof a2CertFile === 'function') { const base = a2CertFile; a2CertFile = (T, d, name) => { if (!CERTK.isNew(T.design)) return base(T, d, name); const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(T.title || '수료증')} ${esc(d.no)}</title><style>body{margin:0;background:#f4f2ec;padding:24px}</style></head><body>${CERTK.html(T, d)}</body></html>`; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); }; }
    if (typeof lsSnapshot === 'function') { const base = lsSnapshot; lsSnapshot = (...a) => { const r = base(...a); try { (r.classes || []).forEach(x => { const c = C(x.id); if (!c || !x.certTpl) return; const T = a2Tpl(c); if (T.design === 'img') Object.assign(x.certTpl, { bg: String(T.bg || '').length <= 520000 ? T.bg || '' : '', bgR: +T.bgR || 0, pos: T.pos || {} }); }); } catch (e) { console.error(e); } return r; }; }
  }
  const CK = () => S.settings.certInfo || (S.settings.certInfo = {});
  const tgtOf = v => v && C(v) ? (C(v).certTpl = { ...(C(v).certTpl || {}), use: 'custom' }) : CK();
  const sample = c => { try { return a2CertData(c || S.classes[0], (c || S.classes[0] || {}).learners ? (c || S.classes[0]).learners[0] : null, null); } catch (e) { return { name: '홍길동', cls: '예시 과정', period: '2026-11-01 ~ 2026-11-30', hours: 16, no: '2026-0001', at: today() }; } };
  const thumbOf = (k, base) => { const T = { ...(base || {}), design: k, fields: { ...((base || {}).fields || {}) } }; const d = sample(); let h = ''; try { h = a2CertHTML(T, d); } catch (e) { } return `<span class="ck-mini" aria-hidden="true"><span class="ck-mini-in">${h}</span></span>`; };
  function galleryHTML(v) { const ci = v && C(v) ? a2Tpl(C(v)) : CK(); const cur = ci.design || 'a';
    return `<div class="ck-gal" role="radiogroup" aria-label="수료증 디자인">${CERTK.LIST.map(([k, n, d]) => `<button type="button" role="radio" aria-checked="${cur === k}" class="ck-card ${cur === k ? 'on' : ''}" data-act="ck-pick" data-v="${esc(v || '')}" data-k="${k}">${thumbOf(k, ci)}<b>${esc(n)}</b><small>${esc(d)}</small></button>`).join('')}
      <button type="button" role="radio" aria-checked="${cur === 'img'}" class="ck-card ${cur === 'img' ? 'on' : ''}" data-act="ck-edit" data-v="${esc(v || '')}">${ci.bg ? thumbOf('img', ci) : `<span class="ck-mini ck-up">${I('download', 22)}<span>이미지 올리기</span></span>`}<b>내 이미지</b><small>올린 수료증 위에 글자 넣기</small></button></div>`; }
  ACT['ck-pick'] = el => { const v = el.dataset.v; const k = el.dataset.k; const T = tgtOf(v); T.design = k; logAudit(`수료증 디자인 — ${CERTK.label(k)}${v ? ' · ' + (C(v) || {}).name : ''}`); save(); render(); toast(`수료증 디자인을 「${CERTK.label(k)}」(으)로 바꿨습니다.`, 'ok'); };
  /* 수료증 화면: 디자인 고르기 카드 · 이수 현황 엑셀 */
  { const base = VIEWS.cert; if (typeof base === 'function') VIEWS.cert = (...a) => { let h = base(...a); try { if (!S || !S.org) return h;
    h = h.replace(/<label>디자인<select data-chg="certInfo" data-k="design">[\s\S]*?<\/select><\/label>/, `<div class="fl ck-curl"><span>디자인</span><b>${esc(CERTK.label(CK().design || 'a'))}</b></div>`);
    const gal = `<section class="card ck-gwrap"><div class="ch"><b>수료증 디자인</b><small>5종 + 내 이미지 · 누르면 바로 바뀝니다</small><span class="sp"></span><button type="button" class="btn sm" data-act="cert-preview">미리보기</button></div>${galleryHTML('')}</section>`;
    const i = h.indexOf('<div class="grid g2">'); if (i >= 0) h = h.slice(0, i) + gal + h.slice(i); else h += gal;
    h = h.replace(/(data-act="cert-manual"[^>]*>[^<]*<\/button>)/, `$1${xlsBtn('', `${t('done')} 현황 엑셀`)}`);
  } catch (e) { console.error(e); } return h; }; }
  /* 수동 발급 창의 디자인 고르기도 5종 */
  if (typeof a2CertIssueModal === 'function') { const base = a2CertIssueModal; a2CertIssueModal = (...a) => { const r = base(...a); try { const s = document.querySelector('#modal select[name=dz]'); if (s && !s.querySelector('option[value=c]')) { s.innerHTML = `<option value="">${esc(t('cls'))} 양식 그대로</option>` + CERTK.LIST.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join(''); } } catch (e) { } return r; }; }
  { const base = ACT['a2-cls-cert']; if (base) ACT['a2-cls-cert'] = el => { if (el.value === 'img') { const c = C(el.dataset.c); c.certTpl = { ...(c.certTpl || {}), use: 'custom', design: 'img' }; save(); render(); ckEdit(c.id); return; } return base(el); }; }

  /* 내 이미지 편집기: 올리기 → 미리보기 위에서 글자를 끌어 옮기기 · 크기 · 색 · 켜기/끄기 */
  function readBg(file, cb) { if (!file || !/^image\/(png|jpe?g|webp)$/.test(file.type)) { toast('PNG · JPG · WEBP 이미지만 올릴 수 있습니다.', 'warn'); return; }
    const fr = new FileReader(); fr.onload = () => { const img = new Image(); img.onload = () => { const r = Math.min(1, 1600 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
      let q = .86, src = cv.toDataURL('image/jpeg', q); while (src.length > 500000 && q > .4) { q -= .12; src = cv.toDataURL('image/jpeg', q); } if (src.length > 520000) { toast('이미지가 너무 큽니다. 더 작은 이미지를 올려 주세요.', 'warn'); return; } cb(src, cv.height / cv.width); }; img.onerror = () => toast('이미지를 읽지 못했습니다.', 'warn'); img.src = fr.result; }; fr.readAsDataURL(file); }
  let ED = null;
  function ckEdit(v) { const T0 = v && C(v) ? a2Tpl(C(v)) : CK(); ED = { v: v || '', T: JSON.parse(JSON.stringify({ ...T0, design: 'img', pos: CERTK.pos(T0) })), sel: 'name' }; paintEd(true); }
  ACT['ck-edit'] = el => ckEdit(el.dataset.v);
  function edBody() { const T = ED.T; const p = T.pos[ED.sel] || {}; const L = CERTK.KEYS;
    return `<div class="ck-ed"><div class="ck-edl"><div class="ck-stage">${CERTK.html(T, sample(ED.v && C(ED.v)), { edit: true })}</div><p class="mini">글자를 끌어서 옮기고, 오른쪽에서 크기 · 색을 고칩니다.${T.bg ? '' : ' 먼저 수료증 이미지를 올리세요(빈 칸에 글자만 넣을 이미지 권장).'}</p></div>
      <div class="ck-edr"><label class="btn ${T.bg ? '' : 'pri'} ck-upl">${I('download', 16)} ${T.bg ? '이미지 바꾸기' : '수료증 이미지 올리기'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="ckBg"></label>
        <div class="ck-keys" role="listbox" aria-label="글자 칸">${L.map(([k, n]) => { const q = T.pos[k] || {}; return `<div class="ck-key ${ED.sel === k ? 'on' : ''}"><button type="button" data-ck-sel="${k}" role="option" aria-selected="${ED.sel === k}">${esc(n)}</button><label class="sl-swl"><input type="checkbox" data-ck-on="${k}" ${q.on !== false ? 'checked' : ''} aria-label="${esc(n)} 보이기"> 보이기</label></div>`; }).join('')}</div>
        <fieldset class="ck-props"><legend>${esc((L.find(x => x[0] === ED.sel) || [])[1] || '')}</legend>
          <label>가로 위치(%)<input type="number" min="0" max="100" step="0.5" data-ck-p="x" value="${+p.x}"></label><label>세로 위치(%)<input type="number" min="0" max="100" step="0.5" data-ck-p="y" value="${+p.y}"></label>
          <label>글자 크기<input type="range" min="8" max="72" data-ck-p="s" value="${+p.s || 14}"></label><label>색<input type="color" data-ck-p="c" value="${esc(p.c || '#1F2020')}"></label>
          <label>정렬<select data-ck-p="al"><option value="" ${!p.al ? 'selected' : ''}>가운데</option><option value="l" ${p.al === 'l' ? 'selected' : ''}>왼쪽</option><option value="r" ${p.al === 'r' ? 'selected' : ''}>오른쪽</option></select></label><label class="sl-swl"><input type="checkbox" data-ck-p="b" ${p.b ? 'checked' : ''}> 굵게</label></fieldset>
        <button type="button" class="btn ghost" data-ck-reset="1">기본 위치로</button></div></div>`; }
  function paintEd(first) { if (!ED) return; const save1 = () => { const T = tgtOf(ED.v); Object.assign(T, { design: 'img', bg: ED.T.bg || '', bgR: ED.T.bgR || 0, pos: ED.T.pos }); logAudit(`수료증 내 이미지 양식 저장${ED.v ? ' · ' + (C(ED.v) || {}).name : ''}`); save(); render(); toast('수료증 양식을 저장했습니다. 발급되는 수료증에 바로 쓰입니다.', 'ok'); ED = null; };
    let w = $('#modal .ck-ed'); if (first || !w) { modal('수료증 — 내 이미지로 만들기', `<div id="ckEdW">${edBody()}</div>`, [{ id: 'c', label: '취소', run: () => { ED = null; } }, { id: 'ok', label: '저장', kind: 'pri', run: () => { if (!ED.T.bg) { toast('수료증 이미지를 먼저 올리세요.', 'warn'); return false; } save1(); } }], true); bindEd(); return; }
    $('#ckEdW').innerHTML = edBody(); bindEd(); }
  function bindEd() { const W = $('#ckEdW'); if (!W || !ED) return;
    const f = W.querySelector('#ckBg'); f && f.addEventListener('change', () => readBg(f.files[0], (src, r) => { ED.T.bg = src; ED.T.bgR = r; paintEd(); }));
    W.querySelectorAll('[data-ck-sel]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); ED.sel = b.dataset.ckSel; paintEd(); }));
    W.querySelectorAll('[data-ck-on]').forEach(b => b.addEventListener('change', () => { ED.T.pos[b.dataset.ckOn].on = b.checked; paintEd(); }));
    W.querySelectorAll('[data-ck-p]').forEach(b => b.addEventListener(b.type === 'range' || b.type === 'color' ? 'input' : 'change', () => { const k = b.dataset.ckP; const p = ED.T.pos[ED.sel]; p[k] = b.type === 'checkbox' ? (b.checked ? 1 : 0) : ['x', 'y', 's'].includes(k) ? Math.max(0, Math.min(k === 's' ? 120 : 100, +b.value || 0)) : b.value; const el = W.querySelector(`.ck-f[data-ck="${ED.sel}"]`); if (el && ['x', 'y', 's', 'c'].includes(k)) { el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.fontSize = (+p.s / 7.6) + 'cqw'; if (p.c) el.style.color = p.c; } else paintEd(); }));
    const rs = W.querySelector('[data-ck-reset]'); rs && rs.addEventListener('click', () => { ED.T.pos = CERTK.pos({}); paintEd(); });
    const st = W.querySelector('.ck.img'); if (!st) return; st.querySelectorAll('.ck-f').forEach(el => { if (el.dataset.ck === ED.sel) el.classList.add('sel');
      el.addEventListener('pointerdown', e => { e.preventDefault(); const k = el.dataset.ck; if (ED.sel !== k) { ED.sel = k; W.querySelectorAll('.ck-f').forEach(x => x.classList.toggle('sel', x === el)); W.querySelectorAll('.ck-key').forEach(x => x.classList.toggle('on', x.querySelector('[data-ck-sel]').dataset.ckSel === k)); const lg = W.querySelector('.ck-props legend'); if (lg) lg.textContent = (CERTK.KEYS.find(x => x[0] === k) || [])[1]; ['x', 'y', 's'].forEach(q => { const i = W.querySelector(`[data-ck-p="${q}"]`); if (i) i.value = ED.T.pos[k][q]; }); }
        const r = st.getBoundingClientRect(); el.setPointerCapture(e.pointerId);
        const mv = ev => { const p = ED.T.pos[k]; p.x = Math.round(Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)) * 2) / 2; p.y = Math.round(Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100)) * 2) / 2; el.style.left = p.x + '%'; el.style.top = p.y + '%'; const ix = W.querySelector('[data-ck-p="x"]'), iy = W.querySelector('[data-ck-p="y"]'); if (ix) ix.value = p.x; if (iy) iy.value = p.y; };
        const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); }); }); }
  window.OPS36.ckEdit = ckEdit;
  /* 디자인 카드 축소 미리보기: 카드 너비에 맞춰 줄인다 */
  const fitMini = () => document.querySelectorAll('.ck-mini').forEach(m => { const i = m.querySelector('.ck-mini-in'); if (!i) return; const w = m.clientWidth; if (!w) return; const sc = w / 760; i.style.transform = `scale(${sc})`; });
  AFTER.push(() => { fitMini(); setTimeout(fitMini, 60); }); addEventListener('resize', () => fitMini());
})();
