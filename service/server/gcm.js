'use strict';
/* v47.5 AES-256-GCM 복호화 공통 — 인증 태그 길이를 16바이트(128비트)로 고정한다.
   Node는 authTagLength를 주지 않으면 4~16바이트의 짧은 태그도 받아들여, 위조 가능성이 커진다(Semgrep gcm-no-tag-length).
   저장 형식은 모두 태그 16바이트로 써 왔다(createCipheriv 기본값 · Java GCMParameterSpec(128)) — 기존 암호문과 호환된다. */
const crypto = require('node:crypto');
const TAG = 16, IV = 12;
function gcmDecipher(key, iv, tag) {
  if (!Buffer.isBuffer(iv) || iv.length !== IV) throw new Error('gcm_iv');
  if (!Buffer.isBuffer(tag) || tag.length !== TAG) throw new Error('gcm_tag');
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG });
  d.setAuthTag(tag);
  return d;
}
module.exports = { gcmDecipher, GCM_TAG: TAG, GCM_IV: IV };
