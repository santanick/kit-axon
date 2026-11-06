'use strict';
/* v32 미디어 저장소 어댑터 — 변환 결과(HLS 세그먼트 · 자막용 음성)를 어디에 둘지 한 곳에서 정한다.
   MEDIA_STORE = db(기본: lms_media_obj.data, 서버 둘이 같은 DB만 보면 됨) | disk(MEDIA_DIR, 기본 /var/tmp/didisam-media) | gcs(운영: MEDIA_GCS_BUCKET)
   재생목록(.m3u8) · 표지(poster.jpg)는 SQL이 서명 쿼리를 붙여 다시 쓰므로 항상 db에 둔다. 표 lms_media_obj에는 어느 저장소든 경로 · 크기 · store가 남는다.
   Java 에디션(egovframework.didisam.lms.v.service.impl.LmsVStore)이 같은 키 규칙(<기관>/<영상>/<경로>)을 쓴다.
   운영(Cloud Run): MEDIA_STORE=gcs + 버킷을 Cloud CDN 백엔드로 두면 세그먼트가 CDN에서 바로 나간다(gcs 어댑터는 @google-cloud/storage가 설치된 경우에만 동작). */
const fs = require('node:fs');
const path = require('node:path');

const KIND = () => (['db', 'disk', 'gcs'].includes(process.env.MEDIA_STORE) ? process.env.MEDIA_STORE : 'db');
const DIR = () => path.resolve(process.env.MEDIA_DIR || '/var/tmp/didisam-media');
const safe = s => { if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(s))) throw new Error('bad key part'); return String(s); };
const safePath = p => { if (!/^[A-Za-z0-9_./-]{1,120}$/.test(p) || p.includes('..')) throw new Error('bad path'); return p; };
const key = (tid, mid, p) => `${safe(tid)}/${safe(mid)}/${safePath(p)}`;

let gcs = null;
function bucket() {
  if (gcs) return gcs;
  let Storage; try { ({ Storage } = require('@google-cloud/storage')); } catch (e) { throw new Error('MEDIA_STORE=gcs에는 @google-cloud/storage 패키지가 필요합니다(운영 이미지에 설치).'); }
  if (!process.env.MEDIA_GCS_BUCKET) throw new Error('MEDIA_GCS_BUCKET이 없습니다.');
  gcs = new Storage().bucket(process.env.MEDIA_GCS_BUCKET); return gcs;
}

/* 넣기: c = 기관 범위 트랜잭션 클라이언트(inTenant 안). textual(재생목록 · 표지)은 항상 db */
async function put(c, tid, mid, p, buf, mime, forceDb) {
  const k = forceDb ? 'db' : KIND();
  if (k === 'disk') { const f = path.join(DIR(), key(tid, mid, p)); await fs.promises.mkdir(path.dirname(f), { recursive: true }); await fs.promises.writeFile(f, buf); }
  else if (k === 'gcs') await bucket().file(key(tid, mid, p)).save(buf, { contentType: mime, resumable: false, metadata: { cacheControl: 'public, max-age=86400, immutable' } });
  await c.query(`insert into lms_media_obj (tenant_id, media_id, path, mime, size, store, data) values (current_setting('app.tenant'), $1, $2, $3, $4, $5, $6)
    on conflict (tenant_id, media_id, path) do update set mime = excluded.mime, size = excluded.size, store = excluded.store, data = excluded.data`, [mid, p, mime, buf.length, k, k === 'db' ? buf : null]);
  return k;
}
/* 읽기(스트리밍 응답용): {buf} 또는 {stream} */
async function get(c, tid, mid, p, store) {
  if (store === 'disk') { const f = path.join(DIR(), key(tid, mid, p)); return { stream: fs.createReadStream(f) }; }
  if (store === 'gcs') return { stream: bucket().file(key(tid, mid, p)).createReadStream() };
  const r = await c.query('select data from lms_media_obj where media_id = $1 and path = $2', [mid, p]);
  return { buf: r.rows[0] ? r.rows[0].data : Buffer.alloc(0) };
}
async function getBuf(c, tid, mid, p, store) {
  const g = await get(c, tid, mid, p, store); if (g.buf) return g.buf;
  const parts = []; for await (const x of g.stream) parts.push(x); return Buffer.concat(parts);
}
/* 영상 하나의 파일 지우기(삭제 · 보존 기한 파기) — db는 SQL이 이미 지웠다 */
async function drop(tid, mid) {
  const k = KIND();
  if (k === 'disk') await fs.promises.rm(path.join(DIR(), safe(tid), safe(mid)), { recursive: true, force: true });
  else if (k === 'gcs') await bucket().deleteFiles({ prefix: `${safe(tid)}/${safe(mid)}/` }).catch(() => {});
}
module.exports = { KIND, put, get, getBuf, drop, key };
