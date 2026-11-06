package egovframework.didisam.pii.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.*;
import egovframework.didisam.pii.service.PiiService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.*;
import java.util.regex.Pattern;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import static egovframework.didisam.cmm.Js.*;

/**
 * 학습자 간편가입 · 개인정보 분리(데이터 최소화) — Node pii.js와 같은 순서 · 같은 오류 · 같은 암호문 형식.
 *  - 트랜잭션 하나 안에서 역할을 나눈다: L = didisam_tenant(pii 권한 없음), P = didisam_pii(pii 스키마만) → PiiTx
 *  - 탈퇴: pii 행 즉시 완전 삭제, 학습 기록은 가명으로 남긴다. pii 열람 · 수정 · 삭제는 pii.access_log에 남긴다
 *  운영: SNS OAuth 토큰 검증 · 이메일 발송 · 본인확인(PASS) 실제 연동은 Node와 같은 지점('운영:' 주석)에서 붙인다.
 */
@Service("piiService")
public class PiiServiceImpl extends EgovAbstractServiceImpl implements PiiService {
    static final List<String> PROVIDERS = List.of("kakao", "naver", "google", "apple");
    static final Pattern NICK_RE = Pattern.compile("[가-힣A-Za-z0-9_-]{2,20}"), STU_RE = Pattern.compile("[0-9]{6,10}"),
        MAIL_RE = Pattern.compile("[^" + Js.WS + "@<>]+@[^" + Js.WS + "@<>]+\\.[^" + Js.WS + "@<>]{2,}"), PHONE_RE = Pattern.compile("01\\d-?\\d{3,4}-?\\d{4}"),
        UUIDISH = Pattern.compile("[0-9a-f-]{36}"), DEVSUB = Pattern.compile("[\\w.-]{3,80}");
    static final Map<String, String> PURPOSES = new LinkedHashMap<>(Map.of("cert", "수료증 발급", "refund", "결제 · 환불 처리", "alimtalk", "알림톡 수신", "legal", "법령상 요청"));
    static final Map<String, String> IDV_REASONS = Map.of("refund", "고용보험 환급 과정", "adult", "성인 인증 콘텐츠", "credit", "학점 인정");
    /** JS 객체 리터럴에서 Object.prototype으로 닿는 이름(IDV_REASONS[x]가 함수가 되어 JSON에서 빠지는 경우) */
    static final Set<String> PROTO_FN = Set.of("constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__");

    @Resource(name = "propertiesService") private EgovPropertyService props;
    private final PiiMapper mapper; private final PiiTx ptx; private final TenantTxMapper txm; private final DdPiiCrypto K; private final DdProps p; private final DdWeb web; private final DdRateLimiter rl;
    private final egovframework.didisam.cpl.service.CplService cpl;
    public PiiServiceImpl(PiiMapper mapper, PiiTx ptx, TenantTxMapper txm, DdPiiCrypto K, DdProps p, DdWeb web, DdRateLimiter rl, egovframework.didisam.cpl.service.CplService cpl) { this.cpl = cpl;
        this.mapper = mapper; this.ptx = ptx; this.txm = txm; this.K = K; this.p = p; this.web = web; this.rl = rl;
    }

    private void need() throws Exception { if (!K.ready()) throw processException("dd.503.pii_key"); }
    private String bidx(String tid, String kind, String v) throws Exception { need(); return K.bidx(tid, kind, v); }
    private String enc(String v, String aad) throws Exception { if (v == null || v.isEmpty()) return null; need(); return K.enc(v, aad); }
    private String dec(Object s, String aad) throws Exception { if (s == null || String.valueOf(s).isEmpty()) return ""; need(); return K.dec((String) s, aad); }
    private void limit(String k, String prop, String win) throws Exception { rl.limit(k, props.getInt(prop), props.getLong(win)); }

    static String maskEmail(String e) {
        String[] ab = String.valueOf(e == null ? "" : e).split("@", -1); if (ab.length < 2 || ab[1].isEmpty()) return "";
        String a = ab[0]; String[] dt = ab[1].split("\\.", -1); String d = dt[0];
        return cut(a, 2) + "*".repeat(Math.max(2, a.length() - 2)) + "@" + cut(d, 1) + "*".repeat(Math.max(2, d.length() - 1)) + "." + String.join(".", Arrays.asList(dt).subList(1, dt.length));
    }
    static String normPhone(String s) {
        String d = String.valueOf(s == null ? "" : s).replaceAll("[^0-9]", "");
        return d.length() == 11 ? d.substring(0, 3) + "-" + d.substring(3, 7) + "-" + d.substring(7) : d.length() == 10 ? d.substring(0, 3) + "-" + d.substring(3, 6) + "-" + d.substring(6) : "";
    }
    private void plog(String tid, String actor, String action, String lid, String purpose, List<String> fields) {
        mapper.insertLog(tid, cut(String.valueOf(actor), 80), action, lid, purpose, String.join(",", fields));
    }
    record Org(String type, JsonNode mode, boolean under14, JsonNode social, boolean idvOn, String idvReason) {}
    private Org orgOf(String tid) {
        Map<String, Object> r = mapper.selectOrg(tid); String type = r == null || r.get("type") == null ? "" : (String) r.get("type");
        JsonNode acct = r == null || r.get("acct") == null ? null : parse((String) r.get("acct"));
        JsonNode a = or(acct, F.objectNode());
        JsonNode soc = get(a, "social"); JsonNode idv = get(a, "idv");
        boolean on = truthy(idv) && truthy(get(idv, "on"));
        return new Org(type, or(get(a, "mode"), t("open")), truthy(get(a, "under14")), soc != null && soc.isArray() ? soc : arrNode(PROVIDERS.stream().map(Js::t).toList()), on, on ? sOr(get(idv, "reason")) : null);
    }

    /** SNS 식별자 → 해시. 운영: 공급자 토큰을 서버에서 검증해 sub를 받는다(카카오 · 네이버 · 구글 · 애플). */
    record Sns(String prov, String sub) {}
    private Sns snsSub(JsonNode b) throws Exception {
        String prov = sOr(get(b, "provider")); if (!PROVIDERS.contains(prov)) throw processException("dd.400.provider");
        /* 운영: const sub = await verifyOAuth(prov, b.token) */
        String ds = sOr(get(b, "dev_sub"));
        if (p.devOauth && DEVSUB.matcher(ds).matches()) return new Sns(prov, ds);
        throw processException("dd.501.oauth_unset");
    }
    private void useOtp(String tid, String b, String purpose, JsonNode code) throws Exception {
        Map<String, Object> r = mapper.selectOtp(tid, b, purpose);
        if (r == null || ((Number) r.get("exp_ms")).longValue() < System.currentTimeMillis()) throw processException("dd.400.otp_expired");
        if (((Number) r.get("tries")).intValue() >= 5) throw processException("dd.429.otp_tries");
        String h = K.codeHash(tid, b, trim(sOr(code)));
        if (!DdPiiCrypto.eqConst(h, (String) r.get("code_hash"))) { mapper.incOtp(tid, b, purpose); throw processException("dd.400.otp_bad"); }
        mapper.deleteOtp(tid, b, purpose);
    }

    @Override public void newLearnerSession(HttpServletResponse res, String tid, String sid) throws Exception {
        String token = DdCrypto.newToken(); mapper.insertLearnerSession(DdCrypto.sha(token), tid, sid); web.setLsid(res, token);
        org.springframework.web.context.request.RequestAttributes ra = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        if (ra instanceof org.springframework.web.context.request.ServletRequestAttributes sa) cpl.afterLogin(sa.getRequest(), tid, sid, DdCrypto.sha(token));
    }

    /* ── 공개(세션 없음) ── */
    @Override public Map<String, Object> otp(HttpServletRequest req, byte[] body, String tid) throws Exception {
        JsonNode b = DdWeb.readBody(body, props.getInt("body.piiMax"));
        String email = trim(sOr(get(b, "email"))).toLowerCase(Locale.ROOT);
        JsonNode pu = get(b, "purpose"); String purpose = pu != null && pu.isTextual() && List.of("signup", "login", "find").contains(pu.textValue()) ? pu.textValue() : "signup";
        limit("otp:" + web.ip(req), "rate.otp.max", "rate.otp.winMs");
        if (!MAIL_RE.matcher(email).matches() || email.length() > 120) throw processException("dd.400.email");
        String e = bidx(tid, "email", email); limit("otpe:" + tid + ":" + e, "rate.otpEmail.max", "rate.otp.winMs");
        String code = String.valueOf(100000 + DdCrypto.RND.nextInt(900000));
        ptx.run(tid, r -> r.P(() -> { mapper.upsertOtp(tid, e, purpose, K.codeHash(tid, e, code)); return null; }));
        /* 운영: 이메일 발송(제목 「[기관명] 인증번호」, 6자리 · 10분). 계정 존재 여부와 관계없이 같은 응답 */
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("ttl", 600); if (p.devOtp) o.put("dev_code", code); return o;
    }

    @Override public Map<String, Object> signup(HttpServletRequest req, HttpServletResponse res, byte[] body, String tid) throws Exception {
        limit("lsu:" + web.ip(req), "rate.lsu.max", "rate.lsu.winMs");
        JsonNode b = DdWeb.readBody(body, props.getInt("body.lsignupMax")); String via = sOr(get(b, "via"));
        JsonNode consent = or(get(b, "consent"), F.objectNode());
        if (!truthy(get(consent, "tos")) || !truthy(get(consent, "privacy"))) throw processException("dd.400.consent");
        String[] out = ptx.run(tid, r -> {
            Org org = r.L(() -> orgOf(tid)); boolean univ = "univ".equals(org.type());
            if (strictEq(org.mode(), "code") && !univ) throw processException("dd.403.mode.code");
            if (strictEq(org.mode(), "invite")) throw processException("dd.403.mode.invite");
            String nick = trim(sOr(get(b, "nickname"))); String login = via, sub = null, email = "", stu = null, dept = "";
            if (univ) {
                if (!"univ".equals(via)) throw processException("dd.400.via.univ");
                stu = trim(sOr(get(b, "student_no"))); dept = cut(trim(sOr(get(b, "dept"))), 40);
                if (!STU_RE.matcher(stu).matches()) throw processException("dd.400.student_no");
                if (dept.isEmpty()) throw processException("dd.400.dept");
                if (sOr(get(b, "pw")).length() < 8) throw processException("dd.400.pw");
                sub = bidx(tid, "univ", stu); if (nick.isEmpty()) nick = slice(stu, -4, stu.length()) + "학번";
            } else if ("email".equals(via)) {
                email = trim(sOr(get(b, "email"))).toLowerCase(Locale.ROOT); if (!MAIL_RE.matcher(email).matches()) throw processException("dd.400.email");
                String eb = bidx(tid, "email", email); r.P(() -> { useOtp(tid, eb, "signup", get(b, "code")); return null; });
            } else if ("sns".equals(via)) {
                Sns s = snsSub(b); if (!includes(org.social(), t(s.prov()))) throw processException("dd.403.provider");
                login = s.prov(); sub = bidx(tid, "sub:" + s.prov(), s.sub());
            } else throw processException("dd.400.via");
            if (!NICK_RE.matcher(nick).matches()) throw processException("dd.400.nickname");
            boolean minor = !univ && !(get(b, "age14") != null && get(b, "age14").isBoolean() && get(b, "age14").booleanValue()); String gContact = "";
            if (minor) {
                if (!org.under14()) throw processException("dd.403.age");
                gContact = trim(sOr(get(get(b, "guardian") == null || !truthy(get(b, "guardian")) ? null : get(b, "guardian"), "contact")));
                String ph = normPhone(gContact);
                if (!MAIL_RE.matcher(gContact).matches() && !PHONE_RE.matcher(ph.isEmpty() ? "-" : ph).matches()) throw processException("dd.400.guardian");
                if (!ph.isEmpty()) gContact = ph;
            }
            String pw = null; JsonNode pwN = get(b, "pw");
            if (truthy(pwN)) { String ps = str(pwN); if (ps.length() >= 8 && ps.length() <= 64) pw = DdCrypto.hashPw(ps); else throw processException("dd.400.pw.range"); }
            String st = minor ? "guardian_pending" : "active";
            String acctLogin = univ ? "univ" : login; String fstu = stu, fdept = dept, fnick = nick; boolean fminor = minor;
            String lid;
            try { lid = r.L(() -> mapper.insertAccount(tid, acctLogin, fnick, fstu, fdept, st, fminor, truthy(get(consent, "mkt")))); }
            catch (DuplicateKeyException e) { throw processException("dd.409.exists.stuno"); }
            ObjectNode cons = F.objectNode(); cons.put("tos", true); cons.put("privacy", true); cons.put("mkt", truthy(get(consent, "mkt")));
            cons.put("ver", cut(str(or(get(consent, "ver"), t("v23"))), 20)); cons.put("at", isoNow());
            String fsub = sub, femail = email, fpw = pw;
            try {
                r.P(() -> { mapper.insertIdentity(tid, lid, acctLogin, fsub, femail.isEmpty() ? null : K.bidx(tid, "email", femail), femail.isEmpty() ? null : enc(femail, DdPiiCrypto.aad(tid, lid, "email")),
                    femail.isEmpty() ? null : maskEmail(femail), fpw, stringify(cons)); return null; });
            } catch (DuplicateKeyException e) { throw processException(univ ? "dd.409.exists.univ" : "email".equals(via) ? "dd.409.exists.email" : "dd.409.exists.sns"); }
            String gtok = "";
            if (minor) {
                byte[] g = new byte[24]; DdCrypto.RND.nextBytes(g); gtok = Base64.getUrlEncoder().withoutPadding().encodeToString(g);
                String gc = enc(gContact, DdPiiCrypto.aad(tid, lid, "guardian")), th = DdCrypto.sha(gtok);
                r.P(() -> { mapper.insertGuardian(tid, lid, gc, th); return null; });
                /* 운영: 보호자에게 동의 링크 발송(learner.html?t=<tid>#guardian/<토큰>). 7일 안에 동의가 없으면 가입 정보 자동 삭제 */
            }
            List<String> fields = new ArrayList<>(); if (!email.isEmpty()) fields.add("email"); if (sub != null) fields.add("provider_sub"); if (pw != null) fields.add("pw"); if (minor) fields.add("guardian");
            r.P(() -> { plog(tid, "self", "create", lid, "signup", fields); return null; });
            ObjectNode det = F.objectNode(); det.put("login", acctLogin); det.put("minor", minor);
            r.L(() -> { txm.insertAudit(tid, "learner:" + lid, "learner.signup", stringify(det)); return null; });
            return new String[]{ lid, st, nick, acctLogin, gtok };
        });
        if ("active".equals(out[1])) newLearnerSession(res, tid, out[0]);
        Map<String, Object> me = new LinkedHashMap<>(); me.put("sid", out[0]); me.put("nickname", out[2]); me.put("login", out[3]); me.put("status", out[1]);
        Map<String, Object> o = new LinkedHashMap<>(); o.put("me", me);
        if ("guardian_pending".equals(out[1])) { o.put("guardian", "sent"); if (p.devOtp) o.put("dev_token", out[4]); }
        return o;
    }

    @Override public Map<String, Object> guardian(HttpServletRequest req, byte[] body, String tid) throws Exception {
        JsonNode b = DdWeb.readBody(body, props.getInt("body.piiMax")); limit("lg:" + web.ip(req), "rate.lg.max", "rate.lg.winMs");
        String th = DdCrypto.sha(sOr(get(b, "token")));
        return ptx.run(tid, r -> {
            Map<String, Object> g = r.P(() -> mapper.selectGuardianPending(tid, th));
            if (g == null) throw processException("dd.404.token");
            String gid = (String) g.get("id"), lid = (String) g.get("learner_id");
            Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true);
            JsonNode ok = get(b, "ok");
            if (!(ok != null && ok.isBoolean() && ok.booleanValue())) {
                r.P(() -> { mapper.deleteGuardianById(gid); mapper.deleteIdentity(tid, lid); plog(tid, "guardian", "delete", lid, "guardian_refused", List.of("all")); return null; });
                r.L(() -> mapper.withdrawRefused(tid, lid)); o.put("status", "refused"); return o;
            }
            r.P(() -> { mapper.guardianOk(gid); plog(tid, "guardian", "consent", lid, "guardian_consent", List.of()); return null; });
            r.L(() -> mapper.activateGuardian(tid, lid)); o.put("status", "active"); return o;
        });
    }

    @Override public String login(HttpServletRequest req, HttpServletResponse res, String tid, JsonNode b) throws Exception {
        limit("ll:" + web.ip(req), "rate.ll.max", "rate.ll.winMs"); String via = sOr(get(b, "via"));
        String lid = ptx.run(tid, r -> {
            String id;
            if ("email".equals(via)) {
                String email = trim(sOr(get(b, "email"))).toLowerCase(Locale.ROOT); if (!MAIL_RE.matcher(email).matches()) throw processException("dd.400.email");
                String e = bidx(tid, "email", email); limit("lle:" + tid + ":" + e, "rate.lle.max", "rate.ll.winMs");
                Map<String, Object> row = r.P(() -> mapper.selectByEmail(tid, e));
                if (truthy(get(b, "code"))) { r.P(() -> { useOtp(tid, e, "login", get(b, "code")); return null; }); if (row == null) throw processException("dd.401.login.noacct"); }
                else {
                    String h = row != null && row.get("pw_hash") != null && !((String) row.get("pw_hash")).isEmpty() ? (String) row.get("pw_hash") : DdCrypto.DUMMY;
                    boolean ok = DdCrypto.checkPw(sOr(get(b, "pw")), h); if (row == null || !ok) throw processException("dd.401.login.email");
                }
                id = (String) row.get("learner_id");
            } else if ("sns".equals(via)) {
                Sns s = snsSub(b); String sh = bidx(tid, "sub:" + s.prov(), s.sub());
                id = r.P(() -> mapper.selectBySub(tid, s.prov(), sh)); if (id == null) throw processException("dd.404.no_account");
            } else if ("univ".equals(via)) {
                String stu = trim(sOr(get(b, "student_no"))); limit("llu:" + tid + ":" + stu, "rate.llu.max", "rate.ll.winMs");
                Map<String, Object> row = STU_RE.matcher(stu).matches() ? r.P(() -> mapper.selectUniv(tid, bidx(tid, "univ", stu))) : null;
                String h = row != null && row.get("pw_hash") != null && !((String) row.get("pw_hash")).isEmpty() ? (String) row.get("pw_hash") : DdCrypto.DUMMY;
                boolean ok = DdCrypto.checkPw(sOr(get(b, "pw")), h); if (row == null || !ok) throw processException("dd.401.login.univ");
                id = (String) row.get("learner_id");
            } else throw processException("dd.400.via.login");
            String fid = id; String st = r.L(() -> mapper.selectStatus(tid, fid));
            if (st == null || "withdrawn".equals(st)) throw processException("dd.401.login.gone");
            if ("guardian_pending".equals(st)) throw processException("dd.403.guardian_pending");
            return id;
        });
        newLearnerSession(res, tid, lid);
        return lid;
    }

    /* ── 본인 세션 필요 ── */
    @Override public Map<String, Object> myPii(HttpServletRequest req, byte[] body, String tid, String sid) throws Exception {
        if ("GET".equals(req.getMethod())) return ptx.run(tid, r -> r.P(() -> {
            Map<String, Object> x = mapper.selectMine(tid, sid); if (x == null) throw processException("dd.404.none");
            String lid = (String) x.get("learner_id");
            plog(tid, "self", "view", lid, "self_access", List.of("email", "phone", "name"));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("provider", x.get("provider"));
            o.put("email", dec(x.get("email_enc"), DdPiiCrypto.aad(tid, lid, "email"))); o.put("phone", dec(x.get("phone_enc"), DdPiiCrypto.aad(tid, lid, "phone")));
            o.put("name", dec(x.get("name_enc"), DdPiiCrypto.aad(tid, lid, "name"))); o.put("consent", parse((String) x.get("consent"))); o.put("created_at", x.get("created_at"));
            return o;
        }));
        JsonNode b = DdWeb.readBody(body, props.getInt("body.piiMax")); String f = sOr(get(b, "field")); String purpose = sOr(get(b, "purpose"));
        if (!List.of("name", "phone").contains(f)) throw processException("dd.400.field");
        if (!PURPOSES.containsKey(purpose) || ("phone".equals(f) && !List.of("alimtalk", "refund").contains(purpose)) || ("name".equals(f) && !List.of("cert", "refund").contains(purpose))) throw processException("dd.400.purpose");
        String v = trim(sOr(get(b, "value")));
        if ("phone".equals(f) && !v.isEmpty()) { v = normPhone(v); if (v.isEmpty()) throw processException("dd.400.phone"); }
        if ("name".equals(f) && v.length() > 30) throw processException("dd.400.name.pii");
        String fv = v;
        return ptx.run(tid, r -> r.P(() -> {
            String lid = mapper.updateField(tid, sid, f, fv.isEmpty() ? null : enc(fv, DdPiiCrypto.aad(tid, sid, f)));
            if (lid == null) throw processException("dd.404.none");
            plog(tid, "self", fv.isEmpty() ? "erase" : "update", lid, purpose, List.of(f));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("field", f); o.put("purpose", PURPOSES.get(purpose)); return o;
        }));
    }

    @Override public Map<String, Object> withdraw(byte[] body, String tid, String sid) throws Exception {
        DdWeb.readBody(body, props.getInt("body.piiMax"));
        ptx.run(tid, r -> {
            Map<String, Object> a = r.L(() -> mapper.selectAcct(tid, sid)); if (a == null) throw processException("dd.404.none");
            String lid = (String) a.get("learner_id");
            r.P(() -> {
                Map<String, Object> idr = mapper.selectEmailBidx(tid, lid);
                if (idr != null && idr.get("email_bidx") != null && !((String) idr.get("email_bidx")).isEmpty()) mapper.deleteOtpAll(tid, (String) idr.get("email_bidx"));
                mapper.deleteGuardianOf(tid, lid);
                mapper.deleteIdentity(tid, lid); /* 완전 삭제 — 복구 불가 */
                plog(tid, "self", "delete", lid, "withdraw", List.of("all")); return null;
            });
            r.L(() -> { mapper.withdraw(tid, lid); txm.insertAudit(tid, "learner:" + lid, "learner.withdraw", "{\"keep\":\"pseudonymous_learning_records\"}"); return null; });
            return null;
        });
        mapper.deleteLearnerSessionsOf(tid, sid);
        Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("deleted", "pii"); o.put("kept", "pseudonymous_learning_records"); return o;
    }

    /** 선택 본인확인(기본 꺼짐): 결과 플래그만 저장하고 이름 · 생년월일 · CI는 저장하지 않는다 */
    @Override public Map<String, Object> verify(byte[] body, String tid, String sid) throws Exception {
        JsonNode b = DdWeb.readBody(body, props.getInt("body.piiMax"));
        return ptx.run(tid, r -> {
            Org org = r.L(() -> orgOf(tid)); if (!org.idvOn()) throw processException("dd.409.idv_off");
            Map<String, Object> a = r.L(() -> mapper.selectAcct(tid, sid)); if (a == null) throw processException("dd.404.none");
            /* 운영: PASS · NICE 본인확인 결과 토큰을 서버에서 검증 → 성공 여부만 쓴다 */
            JsonNode dv = get(b, "dev_ok");
            if (!(p.devIdv && dv != null && dv.isBoolean() && dv.booleanValue())) throw processException("dd.501.idv_unset");
            String lid = (String) a.get("learner_id");
            r.L(() -> mapper.setIdv(tid, lid));
            String reason = org.idvReason();
            r.P(() -> { plog(tid, "self", "idv", lid, reason.isEmpty() ? "idv" : reason, List.of()); return null; });
            Map<String, Object> o = new LinkedHashMap<>(); o.put("ok", true); o.put("idv_ok", true);
            if ("__proto__".equals(reason)) o.put("reason", new LinkedHashMap<>()); else if (!PROTO_FN.contains(reason)) o.put("reason", IDV_REASONS.getOrDefault(reason, ""));
            return o;
        });
    }

    /* ── 운영자 ── */
    @Override public Map<String, Object> adminList(Map<String, Object> a) throws Exception {
        String tid = (String) a.get("tid");
        return ptx.run(tid, r -> {
            List<Map<String, Object>> acc = r.L(() -> mapper.selectAccounts(tid));
            Map<String, Object> masks = new HashMap<>(); for (Map<String, Object> m : r.P(() -> mapper.selectMasks(tid))) masks.put((String) m.get("learner_id"), m.get("email_mask"));
            r.P(() -> { plog(tid, (String) a.get("email"), "list_masked", null, "member_list", List.of("email_mask")); return null; });
            for (Map<String, Object> x : acc) { Object mk = masks.get(x.get("learner_id")); x.put("email_mask", mk == null || "".equals(mk) ? "" : mk); }
            Map<String, Object> o = new LinkedHashMap<>(); o.put("accounts", acc); return o;
        });
    }
    @Override public Map<String, Object> adminPii(Map<String, Object> a, byte[] body) throws Exception {
        if (!"owner".equals(a.get("role"))) throw processException("dd.403.role.pii");
        JsonNode b = DdWeb.readBody(body, props.getInt("body.piiMax"));
        String f = sOr(get(b, "field")), purpose = sOr(get(b, "purpose")), lid = sOr(get(b, "learner_id"));
        if (!List.of("name", "email", "phone").contains(f) || !List.of("cert", "refund", "legal").contains(purpose) || !UUIDISH.matcher(lid).matches()) throw processException("dd.400.bad");
        String tid = (String) a.get("tid");
        return ptx.run(tid, r -> r.P(() -> {
            Map<String, Object> x = mapper.selectField(tid, lid, f); if (x == null) throw processException("dd.404.none.admin");
            plog(tid, (String) a.get("email"), "view", lid, purpose, List.of(f));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("field", f); o.put("value", dec(x.get("v"), DdPiiCrypto.aad(tid, lid, f))); o.put("purpose", PURPOSES.get(purpose)); return o;
        }));
    }
    @Override public Map<String, Object> adminLog(Map<String, Object> a) throws Exception {
        if (!"owner".equals(a.get("role"))) throw processException("dd.403.role");
        String tid = (String) a.get("tid");
        return ptx.run(tid, r -> r.P(() -> {
            List<Map<String, Object>> rows = mapper.selectLogs(tid);
            for (Map<String, Object> x : rows) x.put("fields", parse((String) x.get("fields")));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", rows); return o;
        }));
    }

    /** 매시간 정리(Node index.js tick과 같음): 만료 세션 · 만료 학습자 세션 · 개인정보 보존 기간 */
    @Scheduled(fixedDelay = 3600000, initialDelayString = "${dd.purge.initialMs:3600000}")
    public void tick() {
        try { mapper.deleteExpiredSessions(); } catch (Exception ignore) { }
        try { mapper.deleteExpiredLearnerSessions(); } catch (Exception ignore) { }
        try { purge(); } catch (Exception e) { egovLogger.warn("pii purge: {}", e.toString()); }
    }
    /** 보존 기간: 만료된 인증번호 · 7일 안에 보호자 동의가 없는 미성년 가입 정보는 자동 삭제(기관 구분 없이) */
    @Override public int purge() throws Exception {
        int n = 0;
        for (String tid : mapper.selectTenantIds()) {
            n += ptx.run(tid, r -> {
                List<String> g = r.P(() -> { mapper.deleteOtpExpired(tid); return mapper.purgeGuardians(tid); });
                for (String lid : g) {
                    r.P(() -> { mapper.deleteIdentity(tid, lid); plog(tid, "system", "delete", lid, "guardian_expired", List.of("all")); return null; });
                    r.L(() -> mapper.purgeWithdraw(tid, lid));
                }
                return g.size();
            });
        }
        return n;
    }
}
