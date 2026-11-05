package egovframework.didisam.cmm;

/** API 오류 — 응답 형식 {error: code, message}는 Node 서버와 같다. */
public class DdException extends RuntimeException {
    private final int status; private final String code;
    public DdException(int status, String message, String code) { super(message); this.status = status; this.code = code; }
    public int getStatus() { return status; }
    public String getCode() { return code; }
}
