package egovframework.didisam.cmm;

/** API 오류 — 응답 형식 {error: code, message}는 Node 서버와 같다. */
public class DdException extends RuntimeException {
    private final int status; private final String code;
    public DdException(int status, String message, String code) { super(message); this.status = status; this.code = code; }
    public int getStatus() { return status; }
    public String getCode() { return code; }
    /** QA7 응답에 덧붙일 값(Node HttpErr.extra와 같음 — 예: 학습자 승인 대기 { pending: {…} }) */
    private java.util.Map<String, Object> extra;
    public DdException extra(java.util.Map<String, Object> m) { this.extra = m; return this; }
    public java.util.Map<String, Object> getExtra() { return extra; }
}
