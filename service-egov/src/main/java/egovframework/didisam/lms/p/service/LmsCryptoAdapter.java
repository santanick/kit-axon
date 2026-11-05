package egovframework.didisam.lms.p.service;

/**
 * 암호화 어댑터(SER-008 · DAR-002) — 검증필 암호모듈(ARIA, KCMVP) 연결 지점. Node service/server/lms/aria.js와 같은 규격.
 * 구축 때 기관의 검증필 ARIA 라이브러리를 이 인터페이스로 감싸 @Primary 빈으로 등록하면 바뀐다. 암호문 형식 'v1:' base64url(iv 12 · tag 16 · 본문).
 */
public interface LmsCryptoAdapter {
    String id();
    String alg();
    boolean certified();
    String target();
    boolean ready();
    String encrypt(String plain, String aad) throws Exception;
    String decrypt(String ct, String aad) throws Exception;
}
