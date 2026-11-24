package egovframework.didisam.records;

import egovframework.didisam.cmm.DdException;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.cmm.TenantTx;
import jakarta.servlet.http.HttpServletRequest;

/** 가디언 4차 #14: 개인정보 포함 내려받기 통제(Node records.js exportGate · mask와 같은 규칙 · 같은 오류 코드 · 같은 audit 'export') */
public final class Records {
    private Records() {}
    public record Gate(boolean raw, String reason) {
        public void done(TenantTx tx, String tid, String email, String kind, int n) {
            tx.audit(tid, email, "export", DdWeb.JSON.createObjectNode().put("kind", kind).put("n", n).put("raw", raw).put("reason", reason).toString());
        }
    }
    public static Gate gate(HttpServletRequest req, String role) { return gateOf(req.getParameter("reason"), "1".equals(req.getParameter("raw")), role); }
    /** 본문(POST)으로 받는 경로(마일리지 지급 내역 메일 등) — Node exportGateOf와 같다(d5) */
    public static Gate gateOf(com.fasterxml.jackson.databind.JsonNode b, String role) {
        com.fasterxml.jackson.databind.JsonNode r = b == null ? null : b.get("reason"), w = b == null ? null : b.get("raw");
        boolean raw = w != null && ((w.isBoolean() && w.booleanValue()) || (w.isTextual() && "1".equals(w.textValue())));
        return gateOf(r != null && r.isTextual() ? r.textValue() : null, raw, role);
    }
    public static Gate gateOf(String r, boolean raw, String role) {
        r = r == null ? "" : r.trim(); if (r.length() > 200) r = r.substring(0, 200);
        if (r.length() < 2) throw new DdException(400, "개인정보가 포함된 파일을 내려받으려면 사유를 입력하십시오.", "export_reason");
        if (raw && !"owner".equals(role)) throw new DdException(403, "원본(가리지 않은) 내려받기는 정운영자만 할 수 있습니다.", "export_raw");
        return new Gate(raw, r);
    }
    /** 끝 4자리만 남긴다(4자리 이하면 전부 *) */
    public static String mask(Object v) {
        String s = v == null ? "" : String.valueOf(v); if (s.isEmpty()) return s;
        return s.length() <= 4 ? "*".repeat(s.length()) : "*".repeat(s.length() - 4) + s.substring(s.length() - 4);
    }
}
