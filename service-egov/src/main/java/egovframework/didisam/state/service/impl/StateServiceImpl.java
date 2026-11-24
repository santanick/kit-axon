package egovframework.didisam.state.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.*;
import egovframework.didisam.state.service.StateService;
import java.util.*;
import java.util.regex.Pattern;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.stereotype.Service;

@Service("stateService")
public class StateServiceImpl extends EgovAbstractServiceImpl implements StateService {
    public static final int STATE_MAX = 8 * 1024 * 1024;
    static final Pattern SID_RE = Pattern.compile("^[A-Za-z0-9_-]{4,20}$");
    @Resource(name = "propertiesService") private EgovPropertyService props;
    private final StateMapper mapper; private final TenantTx tx; private final DdProps p; private final DdStateCrypto crypt;
    public StateServiceImpl(StateMapper mapper, TenantTx tx, DdProps p, DdStateCrypto crypt) { this.mapper = mapper; this.tx = tx; this.p = p; this.crypt = crypt; }

    @Override public Map<String, Object> get(Map<String, Object> a) throws Exception {
        String tid = (String) a.get("tid");
        return tx.inTenant(tid, () -> {
            Map<String, Object> r = mapper.selectState(tid); Map<String, Object> o = new LinkedHashMap<>();
            if (r == null) { o.put("doc", null); o.put("rev", 0); return o; }
            JsonNode d = crypt.open(DdWeb.JSON.readTree((String) r.get("doc")), tid); o.put("doc", "teacher".equals(a.get("role")) ? DdModule.teacherView(d, (String) a.get("email")) : d); o.put("rev", r.get("rev")); o.put("at", r.get("at")); return o;
        });
    }

    @Override public DdModule.Scope scope(Map<String, Object> a) throws Exception {
        String tid = (String) a.get("tid"); Map<String, Object> r = tx.inTenant(tid, () -> mapper.selectState(tid));
        return DdModule.scope(r == null ? null : crypt.open(DdWeb.JSON.readTree((String) r.get("doc")), tid), (String) a.get("email"));
    }

    @Override public Map<String, Object> put(Map<String, Object> a, JsonNode b) throws Exception {
        String tid = (String) a.get("tid");
        JsonNode docN = b.get("doc"); JsonNode revN = b.get("rev");
        int rev = revN == null || revN.isNull() ? 0 : revN.isNumber() ? revN.asInt() : (int) Double.parseDouble(revN.asText("0").isEmpty() ? "0" : revN.asText("0"));
        if (docN == null || !docN.isObject() || docN.get("org") == null || !docN.get("org").isObject()) throw processException("dd.400.state");
        if ("teacher".equals(a.get("role"))) {
            Map<String, Object> cur = tx.inTenant(tid, () -> mapper.selectState(tid));
            if (cur == null || ((Number) cur.get("rev")).intValue() != rev) throw processException("dd.409.conflict.rev");
            docN = DdModule.teacherMerge(crypt.open(DdWeb.JSON.readTree((String) cur.get("doc")), tid), docN, (String) a.get("email"));
        }
        ObjectNode doc = (ObjectNode) docN; ObjectNode org = (ObjectNode) doc.get("org");
        JsonNode room = org.get("room");
        String rtid = room != null && room.isObject() ? DdWeb.str(room, "tid") : "";
        if (!rtid.isEmpty() && !rtid.equals(tid)) throw processException("dd.403.tenant");
        ObjectNode nroom = room != null && room.isObject() ? (ObjectNode) room : DdWeb.JSON.createObjectNode();
        nroom.put("tid", tid); org.set("room", nroom);
        if (doc.toString().length() > props.getInt("state.maxBytes")) throw processException("dd.413.too_large");
        /* v46 모델 학습 허용(aipol.train)은 정운영자만 바꾼다 — Node PUT /api/state와 같음(403 aipol_train) */
        JsonNode nap = doc.get("aipol");
        if (nap != null && nap.isObject() && !"owner".equals(a.get("role"))) {
            String cs = tx.inTenant(tid, () -> mapper.selectAipol(tid)); JsonNode cap = cs == null ? null : DdWeb.JSON.readTree(cs);
            boolean nt = nap.path("train").isBoolean() && nap.path("train").asBoolean(), ct = cap != null && cap.path("train").isBoolean() && cap.path("train").asBoolean();
            if (nt != ct) throw processException("dd.403.aipol_train");
        }
        /* v47 요금제(plan) · 월 포함량(aiplan.monthTokens)은 산타가 넣은 저장값이 원천(기관이 보낸 값은 버림), 초과 처리(overage)만 정운영자 — Node PUT /api/state와 같음(400 aiplan · 403 aiplan_role) */
        if (!egovframework.didisam.cmm.DdAiPrice.validPlan(doc.get("aiplan"))) throw new egovframework.didisam.cmm.DdException(400, "AI 월 포함량 값이 올바르지 않습니다.", "aiplan");
        List<String> gone = new ArrayList<>(); boolean owner = "owner".equals(a.get("role")); final String[] mfaChg = new String[2];
        Map<String, Object> out = tx.inTenant(tid, () -> {
            Map<String, Object> pc = mapper.selectPlanCur(tid);
            JsonNode cap = pc == null || pc.get("aiplan") == null ? null : DdWeb.JSON.readTree(String.valueOf(pc.get("aiplan"))), cpl = pc == null || pc.get("plan") == null ? null : DdWeb.JSON.readTree(String.valueOf(pc.get("plan")));
            if (!owner && !egovframework.didisam.cmm.DdAiPrice.ovKey(cap).equals(egovframework.didisam.cmm.DdAiPrice.ovKey(doc.get("aiplan")))) throw new egovframework.didisam.cmm.DdException(403, "AI 초과 처리는 정운영자만 바꿀 수 있습니다.", "aiplan_role");
            egovframework.didisam.cmm.DdAiPrice.keepPlan(doc, cap, cpl, java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).toString());
            /* 보안 4차 #1: 기관 2단계 인증 정책 org.sec.mfa('email' | 'totp')는 정운영자만 바꾸고 audit — Node PUT /api/state와 같음(400 · 403 mfa_policy) */
            { JsonNode sec = doc.path("org").path("sec"); JsonNode nm = sec.isObject() ? sec.get("mfa") : null;
              if (nm != null && !nm.isNull() && !(nm.isTextual() && ("email".equals(nm.asText()) || "totp".equals(nm.asText())))) throw processException("dd.400.mfa_policy");
              String was = "totp".equals(mapper.selectMfaPolicy(tid)) ? "totp" : "email", now = nm != null && "totp".equals(nm.asText()) ? "totp" : "email";
              if (!was.equals(now)) { if (!owner) throw processException("dd.403.mfa_policy.role"); mfaChg[0] = was; mfaChg[1] = now; } }
            String s = crypt.seal(doc, tid).toString();
            Integer r;
            if (rev == 0) {
                r = mapper.insertState(tid, s, s.length());
                if (r == null) throw processException("dd.409.conflict");
            } else {
                r = mapper.updateState(tid, s, s.length(), rev);
                if (r == null) throw processException("dd.409.conflict.rev");
            }
            int pending = syncLearners(tid, doc.get("codes"), gone, props.getInt("learner.syncMax"));
            Map<String, Object> o = new LinkedHashMap<>(Map.of("rev", r)); if (pending > 0) o.put("pending", pending); return o;
        });
        if (mfaChg[0] != null) tx.audit(tid, (String) a.get("email"), "org.mfa", DdWeb.JSON.createObjectNode().put("from", mfaChg[0]).put("to", mfaChg[1]).toString());
        /* 기관 역할 밖(plain): 학습자 세션 정리, 운영 모드 · 기관명 반영 — Node 서버는 같은 시점에 pool로 직접 실행 */
        if (!gone.isEmpty()) tx.plain(() -> { mapper.deleteLearnerSessions(tid, gone); return null; });
        String mode = DdWeb.str(nroom, "mode");
        if (rev != 0 && !mode.isEmpty() && !mode.equals(a.get("mode"))) {
            String nm = DdWeb.str(org, "name"); if (nm.isEmpty()) nm = (String) a.get("name");
            String fm = mode.length() > 20 ? mode.substring(0, 20) : mode, fn = nm.length() > 30 ? nm.substring(0, 30) : nm;
            tx.plain(() -> { mapper.updateTenantMode(tid, fm, fn); return null; });
        }
        return out;
    }

    /** v36 일괄 등록 뒤 남은 학습자 로그인 계정을 learner.syncBatch(500)건씩 마저 만든다 — Node POST /api/learners/sync와 같음 */
    @Override public Map<String, Object> syncPending(Map<String, Object> a) throws Exception {
        String tid = (String) a.get("tid"); List<String> gone = new ArrayList<>();
        int pending = tx.inTenant(tid, () -> { Map<String, Object> r = mapper.selectState(tid); if (r == null) return 0;
            JsonNode d = crypt.open(DdWeb.JSON.readTree((String) r.get("doc")), tid); return syncLearners(tid, d == null ? null : d.get("codes"), gone, props.getInt("learner.syncBatch")); });
        if (!gone.isEmpty()) tx.plain(() -> { mapper.deleteLearnerSessions(tid, gone); return null; });
        return new LinkedHashMap<>(Map.of("pending", pending));
    }

    /** 어드민이 발급한 접근코드(doc.codes)를 학습자 로그인 표로 동기화 — 바뀐 코드만 scrypt로 다시 해시(한 번에 최대 max건, 남은 건수를 돌려준다).
     *  v36: 한도에서 멈추면 그 뒤 학번이 '삭제 대상'으로 잘못 잡히던 문제 — 모든 유효 학번을 먼저 keep에 넣는다 */
    private int syncLearners(String tid, JsonNode codes, List<String> goneOut, int max) {
        if (codes == null || !codes.isArray()) return 0;
        Map<String, String> cur = new HashMap<>();
        for (Map<String, Object> r : mapper.selectLearnerFps(tid)) cur.put((String) r.get("sid"), (String) r.get("code_fp"));
        Set<String> keep = new HashSet<>(); int n = 0, todo = 0, i = 0;
        for (JsonNode x : codes) {
            if (i++ >= props.getInt("learner.codesMax")) break;
            String sid = x != null && x.isObject() ? DdWeb.str(x, "sid") : ""; String code = x != null && x.isObject() ? DdWeb.str(x, "code") : "";
            if (!SID_RE.matcher(sid).matches() || code.length() < 4 || code.length() > 20 || keep.contains(sid)) continue; keep.add(sid);
            String fp = DdCrypto.hmacHex(p.pepper, tid + "|" + sid + "|" + code.toUpperCase());
            if (fp.equals(cur.get(sid))) continue;
            todo++; if (++n > max) continue;
            String dept = DdWeb.str(x, "dept"); if (dept.length() > 40) dept = dept.substring(0, 40);
            mapper.upsertLearner(tid, sid, dept, fp, DdCrypto.hashPw(code.toUpperCase()));
        }
        for (String sid : cur.keySet()) if (!keep.contains(sid)) goneOut.add(sid);
        if (!goneOut.isEmpty()) mapper.deleteLearners(tid, goneOut);
        return Math.max(0, todo - max);
    }
}
