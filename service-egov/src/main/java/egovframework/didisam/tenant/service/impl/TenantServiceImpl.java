package egovframework.didisam.tenant.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.cmm.*;
import egovframework.didisam.tenant.service.TenantService;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import java.util.*;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.stereotype.Service;

@Service("tenantService")
public class TenantServiceImpl extends EgovAbstractServiceImpl implements TenantService {
    @Resource(name = "propertiesService") private EgovPropertyService props;
    private final TenantMapper mapper; private final TenantTx tx; private final DdWeb web;
    public TenantServiceImpl(TenantMapper mapper, TenantTx tx, DdWeb web) { this.mapper = mapper; this.tx = tx; this.web = web; }

    @Override public Map<String, Object> audit(Map<String, Object> a) throws Exception {
        if (!"owner".equals(a.get("role"))) throw processException("dd.403.role");
        String tid = (String) a.get("tid");
        return tx.inTenant(tid, () -> {
            List<Map<String, Object>> rows = mapper.selectAudit(tid);
            for (Map<String, Object> r : rows) r.put("detail", r.get("detail") == null ? null : Js.parse((String) r.get("detail")));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("rows", rows); return o;
        });
    }
    /** 학습자 진도 모아 보기 — { lp: { 학번: 기록 } } (JS 객체 키 순서: 정수 모양 키 먼저) */
    @Override public Map<String, Object> progress(Map<String, Object> a) throws Exception {
        String tid = (String) a.get("tid");
        return tx.inTenant(tid, () -> {
            List<Map.Entry<String, JsonNode>> es = new ArrayList<>();
            for (Map<String, Object> r : mapper.selectProgress(tid)) es.add(Map.entry((String) r.get("sid"), Js.parse((String) r.get("lp"))));
            Map<String, Object> o = new LinkedHashMap<>(); o.put("lp", Js.fromEntries(es)); return o;
        });
    }
    /** 기관 파기: 정운영자 · 비밀번호 · 기관명 확인 → tenants 삭제(상태 · 사용자 · 세션 · 로그 · 학습자 · 개인정보 모두 cascade) */
    @Override public Map<String, Object> delete(Map<String, Object> a, byte[] body, HttpServletResponse res) throws Exception {
        if (!"owner".equals(a.get("role"))) throw processException("dd.403.role.delete");
        JsonNode b = DdWeb.readBody(body, props.getInt("body.loginMax"));
        String pw = mapper.selectPw((String) a.get("uid"));
        if (pw == null || !DdCrypto.checkPw(DdWeb.str(b, "password"), pw)) throw processException("dd.401.login.pw");
        if (!DdWeb.str(b, "confirm").equals(a.get("name"))) throw processException("dd.400.confirm");
        mapper.deleteTenant((String) a.get("tid"));
        egovLogger.info("tenant deleted {}", a.get("tid"));
        web.clearSid(res);
        return new LinkedHashMap<>(Map.of("ok", true));
    }
}
