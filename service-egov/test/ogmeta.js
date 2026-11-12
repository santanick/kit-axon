'use strict';
/* v37 L2 링크 공유 미리보기(og 메타) Node ↔ Java 대조. 사용: node ogmeta.js <Node 주소> <Java 주소> (두 서버는 같은 DB · 같은 PUBLIC_DIR)
   게시본 값을 여러 가지로 바꿔 가며 learner.html 응답 바이트가 두 서버에서 같은지 본다 */
(async () => {
  const [nu, ju] = process.argv.slice(2); const H = { 'x-didisam': '1', 'content-type': 'application/json' };
  const em = `og${Date.now().toString(36)}@a.kr`; const su = await fetch(nu + '/api/signup', { method: 'POST', headers: H, body: JSON.stringify({ email: em, password: 'Passw0rd-aaa', orgName: 'OG', type: 'public', code: process.env.SIGNUP_CODE || 'C0DE' }) });
  const ck = su.headers.get('set-cookie').split(';')[0]; const tid = (await su.json()).tenant.tid; let rev = 0;
  const CASES = [null,
    { org: { name: '기관만' } },
    { org: { name: 'O' }, hp: { name: '해운대구 "평생학습관"', seo: { title: '', desc: '줄\n바꿈  <b>설명</b> &   공백　끝 ', img: 'https://cdn.example.kr/og.png?x=1&y=2', index: true } } },
    { hp: { name: 'x', seo: { title: 't'.repeat(200), desc: '가'.repeat(400), img: 'data:image/png;base64,AAAA', index: false } } },
    { hp: { name: 'x', seo: { title: 7, desc: true, img: 'http://a.kr/x.png' } } },
    { hp: { name: '', seo: { title: "'홑' <x>", img: 'https://a.kr/"x.png' } } }];
  let fail = 0;
  for (const [i, pub] of CASES.entries()) {
    const put = await fetch(nu + '/api/state', { method: 'PUT', headers: { ...H, cookie: ck }, body: JSON.stringify({ doc: { org: { name: 'OG', type: 'public' }, lsite: { pub } }, rev }) }); rev = (await put.json()).rev;
    for (const q of [`?t=${tid}`, '?t=tn_nonexist000', '']) { const [a, b] = await Promise.all([nu, ju].map(u => fetch(u + '/learner.html' + q).then(async r => ({ s: r.status, t: await r.text() }))));
      const same = a.s === b.s && a.t === b.t; if (!same) { fail++; console.log('다름', i, q, '\n node', JSON.stringify(a).slice(0, 900), '\n java', JSON.stringify(b).slice(0, 900)); } else console.log('같음', i, q || '(t 없음)', a.t.includes('og:title') ? 'og 있음' : 'og 없음'); }
  }
  console.log(`fail ${fail}`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
