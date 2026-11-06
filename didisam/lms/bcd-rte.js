/* v30 학사 LMS 묶음 B — SCORM 1.2(window.API) · 2004(window.API_1484_11) 런타임(RTE). 스튜디오(lms/b.js)와 학습자 앱(lms/bcd-learner.js)이 같이 쓴다.
   데이터 모델 검사 · 오류 코드 · 이어 학습(entry · suspend_data · location) · 세션 시간 · 숙달 점수 판정. 저장은 hooks.commit(본문) → POST /api/lms/b/scorm-commit */
(function () {
  'use strict';
  /* ══════════ SCORM 런타임(RTE) — 1.2 API · 2004 API_1484_11 ══════════ */
  const E12 = { 0: 'No error', 101: 'General exception', 201: 'Invalid argument error', 202: 'Element cannot have children', 203: 'Element not an array - cannot have count', 301: 'Not initialized', 401: 'Not implemented error', 402: 'Invalid set value, element is a keyword', 403: 'Element is read only', 404: 'Element is write only', 405: 'Incorrect data type' };
  const E04 = { 0: 'No Error', 101: 'General Exception', 102: 'General Initialization Failure', 103: 'Already Initialized', 104: 'Content Instance Terminated', 111: 'General Termination Failure', 112: 'Termination Before Initialization', 113: 'Termination After Termination', 122: 'Retrieve Data Before Initialization', 123: 'Retrieve Data After Termination', 132: 'Store Data Before Initialization', 133: 'Store Data After Termination', 142: 'Commit Before Initialization', 143: 'Commit After Termination', 201: 'General Argument Error', 301: 'General Get Failure', 351: 'General Set Failure', 391: 'General Commit Failure', 401: 'Undefined Data Model Element', 402: 'Unimplemented Data Model Element', 403: 'Data Model Element Value Not Initialized', 404: 'Data Model Element Is Read Only', 405: 'Data Model Element Is Write Only', 406: 'Data Model Element Type Mismatch', 407: 'Data Model Element Value Out Of Range', 408: 'Data Model Dependency Not Established' };
  const dec = v => /^-?\d+(\.\d+)?$/.test(String(v));
  const ts12 = v => /^\d{2,4}:\d{2}:\d{2}(\.\d{1,2})?$/.test(v);
  const ts04 = v => /^P(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d{1,2})?S)?)?$/.test(v);
  const vocab = l => v => l.includes(v);
  /* 요소 규칙: [접근(r/w/rw), 검사 함수, 범위 오류 여부] — n은 배열 순번 */
  const M12 = {
    'cmi.core.student_id': ['r'], 'cmi.core.student_name': ['r'], 'cmi.core.lesson_location': ['rw', v => v.length <= 255], 'cmi.core.credit': ['r'], 'cmi.core.entry': ['r'], 'cmi.core.total_time': ['r'], 'cmi.core.lesson_mode': ['r'],
    'cmi.core.lesson_status': ['rw', vocab(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'])], 'cmi.core.exit': ['w', vocab(['time-out', 'suspend', 'logout', ''])], 'cmi.core.session_time': ['w', ts12],
    'cmi.core.score.raw': ['rw', v => v === '' || (dec(v) && +v >= 0 && +v <= 100)], 'cmi.core.score.min': ['rw', v => v === '' || (dec(v) && +v >= 0 && +v <= 100)], 'cmi.core.score.max': ['rw', v => v === '' || (dec(v) && +v >= 0 && +v <= 100)],
    'cmi.suspend_data': ['rw', v => v.length <= 4096], 'cmi.launch_data': ['r'], 'cmi.comments': ['rw', v => v.length <= 4096], 'cmi.comments_from_lms': ['r'], 'cmi.student_data.mastery_score': ['r'], 'cmi.student_data.max_time_allowed': ['r'], 'cmi.student_data.time_limit_action': ['r'],
    'cmi.student_preference.audio': ['rw', v => dec(v) && +v >= -1 && +v <= 100], 'cmi.student_preference.language': ['rw', v => v.length <= 255], 'cmi.student_preference.speed': ['rw', v => dec(v) && +v >= -100 && +v <= 100], 'cmi.student_preference.text': ['rw', vocab(['-1', '0', '1'])],
    'cmi.objectives.n.id': ['rw', v => v.length <= 255 && v !== ''], 'cmi.objectives.n.score.raw': ['rw', v => v === '' || (dec(v) && +v >= 0 && +v <= 100)], 'cmi.objectives.n.score.min': ['rw', v => v === '' || dec(v)], 'cmi.objectives.n.score.max': ['rw', v => v === '' || dec(v)],
    'cmi.objectives.n.status': ['rw', vocab(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'])],
    'cmi.interactions.n.id': ['w', v => v.length <= 255 && v !== ''], 'cmi.interactions.n.objectives.n.id': ['w', v => v.length <= 255], 'cmi.interactions.n.time': ['w', v => /^\d{2}:\d{2}:\d{2}(\.\d{1,2})?$/.test(v)], 'cmi.interactions.n.type': ['w', vocab(['true-false', 'choice', 'fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric'])],
    'cmi.interactions.n.correct_responses.n.pattern': ['w', v => v.length <= 255], 'cmi.interactions.n.weighting': ['w', dec], 'cmi.interactions.n.student_response': ['w', v => v.length <= 255], 'cmi.interactions.n.result': ['w', v => ['correct', 'wrong', 'unanticipated', 'neutral'].includes(v) || dec(v)], 'cmi.interactions.n.latency': ['w', ts12]
  };
  const KIDS12 = { 'cmi.core._children': 'student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,lesson_mode,exit,session_time', 'cmi.core.score._children': 'raw,min,max', 'cmi.objectives._children': 'id,score,status', 'cmi.student_data._children': 'mastery_score,max_time_allowed,time_limit_action', 'cmi.student_preference._children': 'audio,language,speed,text', 'cmi.interactions._children': 'id,objectives,time,type,correct_responses,weighting,student_response,result,latency', 'cmi._version': '3.4' };
  const M04 = {
    'cmi._version': ['r'], 'cmi.learner_id': ['r'], 'cmi.learner_name': ['r'], 'cmi.credit': ['r'], 'cmi.entry': ['r'], 'cmi.mode': ['r'], 'cmi.total_time': ['r'], 'cmi.launch_data': ['r'], 'cmi.completion_threshold': ['r'], 'cmi.scaled_passing_score': ['r'], 'cmi.max_time_allowed': ['r'], 'cmi.time_limit_action': ['r'],
    'cmi.location': ['rw', v => v.length <= 1000], 'cmi.suspend_data': ['rw', v => v.length <= 64000], 'cmi.completion_status': ['rw', vocab(['completed', 'incomplete', 'not attempted', 'unknown'])], 'cmi.success_status': ['rw', vocab(['passed', 'failed', 'unknown'])],
    'cmi.exit': ['w', vocab(['time-out', 'suspend', 'logout', 'normal', ''])], 'cmi.session_time': ['w', ts04], 'cmi.progress_measure': ['rw', v => dec(v), v => +v >= 0 && +v <= 1],
    'cmi.score.scaled': ['rw', dec, v => +v >= -1 && +v <= 1], 'cmi.score.raw': ['rw', dec], 'cmi.score.min': ['rw', dec], 'cmi.score.max': ['rw', dec],
    'cmi.learner_preference.audio_level': ['rw', dec, v => +v >= 0], 'cmi.learner_preference.language': ['rw', v => v.length <= 250], 'cmi.learner_preference.delivery_speed': ['rw', dec, v => +v >= 0], 'cmi.learner_preference.audio_captioning': ['rw', vocab(['-1', '0', '1'])],
    'cmi.comments_from_learner.n.comment': ['rw', v => v.length <= 4000], 'cmi.comments_from_learner.n.location': ['rw', v => v.length <= 250], 'cmi.comments_from_learner.n.timestamp': ['rw', v => /^\d{4}(-\d{2}(-\d{2}(T\d{2}(:\d{2}(:\d{2}(\.\d{1,2})?)?)?)?)?)?/.test(v)],
    'cmi.objectives.n.id': ['rw', v => v.length <= 4000 && v !== ''], 'cmi.objectives.n.score.scaled': ['rw', dec, v => +v >= -1 && +v <= 1], 'cmi.objectives.n.score.raw': ['rw', dec], 'cmi.objectives.n.score.min': ['rw', dec], 'cmi.objectives.n.score.max': ['rw', dec],
    'cmi.objectives.n.success_status': ['rw', vocab(['passed', 'failed', 'unknown'])], 'cmi.objectives.n.completion_status': ['rw', vocab(['completed', 'incomplete', 'not attempted', 'unknown'])], 'cmi.objectives.n.progress_measure': ['rw', dec, v => +v >= 0 && +v <= 1], 'cmi.objectives.n.description': ['rw', v => v.length <= 250],
    'cmi.interactions.n.id': ['rw', v => v.length <= 4000 && v !== ''], 'cmi.interactions.n.type': ['rw', vocab(['true-false', 'choice', 'fill-in', 'long-fill-in', 'likert', 'matching', 'performance', 'sequencing', 'numeric', 'other'])], 'cmi.interactions.n.objectives.n.id': ['rw', v => v.length <= 4000],
    'cmi.interactions.n.timestamp': ['rw', v => /^\d{4}/.test(v)], 'cmi.interactions.n.correct_responses.n.pattern': ['rw', v => v.length <= 4000], 'cmi.interactions.n.weighting': ['rw', dec], 'cmi.interactions.n.learner_response': ['rw', v => v.length <= 4000],
    'cmi.interactions.n.result': ['rw', v => ['correct', 'incorrect', 'unanticipated', 'neutral'].includes(v) || dec(v)], 'cmi.interactions.n.latency': ['rw', ts04], 'cmi.interactions.n.description': ['rw', v => v.length <= 250],
    'adl.nav.request': ['rw', v => /^(continue|previous|choice|jump|exit|exitAll|abandon|abandonAll|suspendAll|_none_|\{target=[^}]+\}(choice|jump))$/.test(v)]
  };
  const KIDS04 = { 'cmi.score._children': 'scaled,raw,min,max', 'cmi.objectives._children': 'id,score,success_status,completion_status,progress_measure,description', 'cmi.interactions._children': 'id,type,objectives,timestamp,correct_responses,weighting,learner_response,result,latency,description', 'cmi.learner_preference._children': 'audio_level,language,delivery_speed,audio_captioning', 'cmi.comments_from_learner._children': 'comment,location,timestamp', 'cmi.comments_from_lms._children': 'comment,location,timestamp' };
  const pat = el => el.replace(/\.\d+(?=\.|$)/g, '.n');
  function makeRTE(ver, sco, att, me, hooks) {
    const v12 = ver === '1.2'; const prev = (att || {}).cmi || {}; const cmi = { ...prev }; let state = 0, last = 0, dirty = false;
    const idN = me.no || 'preview';
    if (v12) { Object.assign(cmi, { 'cmi.core.student_id': idN, 'cmi.core.student_name': idN, 'cmi.core.credit': me.no ? 'credit' : 'no-credit', 'cmi.core.lesson_mode': me.no ? 'normal' : 'browse', 'cmi.launch_data': sco.launch_data || '', 'cmi.student_data.mastery_score': sco.mastery || '' });
      if (!prev['cmi.core.lesson_status']) cmi['cmi.core.lesson_status'] = 'not attempted'; if (!('cmi.core.entry' in prev)) cmi['cmi.core.entry'] = 'ab-initio'; if (!prev['cmi.core.total_time']) cmi['cmi.core.total_time'] = '0000:00:00.00'; }
    else { Object.assign(cmi, { 'cmi._version': '1.0', 'cmi.learner_id': idN, 'cmi.learner_name': idN, 'cmi.credit': me.no ? 'credit' : 'no-credit', 'cmi.mode': me.no ? 'normal' : 'browse', 'cmi.launch_data': sco.launch_data || '' });
      if (!prev['cmi.completion_status']) cmi['cmi.completion_status'] = 'unknown'; if (!prev['cmi.success_status']) cmi['cmi.success_status'] = 'unknown'; cmi['cmi.entry'] = prev['cmi.exit'] === 'suspend' ? 'resume' : prev['cmi.total_time'] ? '' : 'ab-initio'; if (!prev['cmi.total_time']) cmi['cmi.total_time'] = 'PT0H0M0S'; delete cmi['cmi.exit']; }
    const M = v12 ? M12 : M04, K = v12 ? KIDS12 : KIDS04; const log = [];
    const count = base => { let n = 0; while (Object.keys(cmi).some(k => k.startsWith(`${base}.${n}.`))) n++; return n; };
    const ret = (code, val) => { last = code; return val; };
    function get(el) {
      el = String(el ?? '');
      if (v12 ? state !== 1 : state !== 1) return ret(v12 ? 301 : state === 0 ? 122 : 123, '');
      if (!el) return ret(v12 ? 201 : 301, '');
      if (K[el] !== undefined) return ret(0, K[el]);
      if (/\._children$/.test(el)) return ret(v12 ? 202 : 301, '');
      if (/\._count$/.test(el)) { const base = el.replace(/\._count$/, ''); if (/^(cmi\.objectives|cmi\.interactions|cmi\.comments_from_learner|cmi\.comments_from_lms|cmi\.interactions\.\d+\.objectives|cmi\.interactions\.\d+\.correct_responses)$/.test(base)) return ret(0, String(count(base))); return ret(v12 ? 203 : 301, ''); }
      const rule = M[pat(el)]; if (!rule) return ret(v12 ? 201 : 401, '');
      if (rule[0] === 'w') return ret(v12 ? 404 : 405, '');
      if (!(el in cmi)) return ret(v12 ? 0 : 403, '');
      return ret(0, String(cmi[el]));
    }
    function set(el, val) {
      el = String(el ?? ''); val = val == null ? '' : String(val);
      if (state !== 1) return ret(v12 ? 301 : state === 0 ? 132 : 133, 'false');
      if (/\._(children|count|version)$/.test(el)) return ret(v12 ? 402 : 404, 'false');
      const rule = M[pat(el)]; if (!rule) return ret(v12 ? 201 : 401, 'false');
      if (rule[0] === 'r') return ret(v12 ? 403 : 404, 'false');
      /* 배열 순번은 0부터 차례로(건너뛰기 금지) */
      const m = /^(cmi\.(?:objectives|interactions|comments_from_learner))\.(\d+)\./.exec(el); if (m && +m[2] > count(m[1])) return ret(v12 ? 201 : 351, 'false');
      if (!v12 && m && !/\.id$/.test(el) && !(`${m[1]}.${m[2]}.id` in cmi) && m[1] !== 'cmi.comments_from_learner') return ret(408, 'false');
      if (rule[1] && !rule[1](val)) return ret(v12 ? 405 : 406, 'false');
      if (rule[2] && !rule[2](val)) return ret(407, 'false');
      cmi[el] = val; dirty = true; log.push([el, val]); return ret(0, 'true');
    }
    const payload = () => Object.fromEntries(Object.entries(cmi).filter(([k]) => { const r = M[pat(k)]; return r && r[0] !== 'r'; }).concat(v12 ? [] : [['cmi.exit', cmi['cmi.exit'] || '']]).filter(([k, v]) => v !== undefined));
    async function push(finish) {
      const body = payload(); if (v12 && cmi['cmi.core.lesson_status'] === 'not attempted' && finish) body['cmi.core.lesson_status'] = 'completed';
      if (v12 && finish && sco.mastery && body['cmi.core.score.raw'] !== undefined && body['cmi.core.score.raw'] !== '' && ['completed', 'incomplete', 'browsed'].includes(body['cmi.core.lesson_status'])) body['cmi.core.lesson_status'] = +body['cmi.core.score.raw'] >= +sco.mastery ? 'passed' : 'failed';
      try { const r = await hooks.commit({ resource: hooks.res, sco: sco.id, cmi: body, finish }); dirty = false; hooks.onCommit && hooks.onCommit(r, finish); return true; } catch (e) { hooks.onError && hooks.onError(e); return false; }
    }
    const api12 = {
      LMSInitialize: a => { if (String(a ?? '') !== '') return ret(201, 'false'); if (state === 1) return ret(101, 'false'); state = 1; return ret(0, 'true'); },
      LMSFinish: a => { if (String(a ?? '') !== '') return ret(201, 'false'); if (state !== 1) return ret(301, 'false'); state = 2; push(true); return ret(0, 'true'); },
      LMSGetValue: get, LMSSetValue: set,
      LMSCommit: a => { if (String(a ?? '') !== '') return ret(201, 'false'); if (state !== 1) return ret(301, 'false'); push(false); return ret(0, 'true'); },
      LMSGetLastError: () => String(last), LMSGetErrorString: c => E12[+c] || '', LMSGetDiagnostic: c => E12[c === '' || c == null ? last : +c] || ''
    };
    const api04 = {
      Initialize: a => { if (String(a ?? '') !== '') return ret(201, 'false'); if (state === 1) return ret(103, 'false'); if (state === 2) return ret(104, 'false'); state = 1; return ret(0, 'true'); },
      Terminate: a => { if (String(a ?? '') !== '') return ret(201, 'false'); if (state === 0) return ret(112, 'false'); if (state === 2) return ret(113, 'false'); state = 2; push(true); return ret(0, 'true'); },
      GetValue: get, SetValue: set,
      Commit: a => { if (String(a ?? '') !== '') return ret(201, 'false'); if (state === 0) return ret(142, 'false'); if (state === 2) return ret(143, 'false'); push(false); return ret(0, 'true'); },
      GetLastError: () => String(last), GetErrorString: c => E04[+c] || '', GetDiagnostic: c => E04[c === '' || c == null ? last : +c] || ''
    };
    return { api: v12 ? api12 : api04, cmi, log, state: () => state, dirty: () => dirty, push, abandon: () => { if (state === 1) { state = 2; return push(true); } } };
  }
  window.LMSRTE = { make: makeRTE };
})();
