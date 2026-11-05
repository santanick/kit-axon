package egovframework.didisam.lms.l.service.impl;

import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.lms.l.service.LmsLService;
import egovframework.didisam.lms.p.service.impl.LmsDispatch;
import jakarta.servlet.http.HttpServletRequest;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/** 묶음 L — 통합 달력(iCal) · DM · 알림 규칙 · 방해금지 · 발송 대기열(연동 지점) */
@Service("lmsLService")
public class LmsLServiceImpl extends EgovAbstractServiceImpl implements LmsLService {
    private final LmsLMapper mapper; private final LmsDispatch d;
    public LmsLServiceImpl(LmsLMapper mapper, LmsDispatch d) { this.mapper = mapper; this.d = d; }

    @Override public ResponseEntity<String> run(String op, String method, byte[] body, HttpServletRequest req) throws Exception {
        String out = d.run(mapper::call, op, method, body, req, null, LmsDispatch.BODY_MAX, 2); // 학습자 포털 세션도 받는다(학생 DM · 알림 · 개인 일정)
        if ("cal.ics".equals(op)) return ResponseEntity.ok().header("content-type", "text/calendar; charset=utf-8")
            .header("content-disposition", "attachment; filename=\"didisam-calendar.ics\"").body(DdWeb.JSON.readTree(out).get("ics").asText());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(out);
    }
}
