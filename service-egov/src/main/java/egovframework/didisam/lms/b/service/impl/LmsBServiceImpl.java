package egovframework.didisam.lms.b.service.impl;

import egovframework.didisam.lms.b.service.LmsBService;
import egovframework.didisam.cmm.DdException;
import egovframework.didisam.lms.b.service.impl.LmsBcdCore;
import egovframework.didisam.lms.b.service.impl.LmsBcdCore.Route;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

/** 학사 LMS 묶음 B — 강의실 구성(주차 · 차시 · 자원 · SCORM · 조건부/순차/수준별/적응형 · 템플릿 · 복사 · 백업 · 휴지통 · 버전 · 공유 · 역할/메뉴). 경로 표는 Node lms/mod-b.js ROUTES와 같다. */
@Service("lmsBService")
public class LmsBServiceImpl extends EgovAbstractServiceImpl implements LmsBService {
    static final Map<String, Route> ROUTES = Map.ofEntries(
        Map.entry("sections", Route.get()),
        Map.entry("templates", Route.get()),
        Map.entry("ext-list", Route.get()),
        Map.entry("library", Route.get()),
        Map.entry("perms", Route.get()),
        Map.entry("file", Route.get()),
        Map.entry("overview", Route.get()),
        Map.entry("timeline", Route.get()),
        Map.entry("progress", Route.get()),
        Map.entry("next", Route.get()),
        Map.entry("backups", Route.get()),
        Map.entry("backup-get", Route.get()),
        Map.entry("trash", Route.get()),
        Map.entry("res-versions", Route.get()),
        Map.entry("menu", Route.get()),
        Map.entry("scorm", Route.get()),
        Map.entry("scorm-file", Route.get()),
        Map.entry("scorm-report", Route.get()),
        Map.entry("perm-set", Route.post(4096, true)),
        Map.entry("week-save", Route.post()),
        Map.entry("week-del", Route.post()),
        Map.entry("session-save", Route.post()),
        Map.entry("session-del", Route.post()),
        Map.entry("res-save", Route.post(524288)),
        Map.entry("res-del", Route.post()),
        Map.entry("res-restore", Route.post()),
        Map.entry("res-purge", Route.post()),
        Map.entry("res-revert", Route.post()),
        Map.entry("res-reuse", Route.post()),
        Map.entry("progress-mark", Route.post()),
        Map.entry("level-set", Route.post()),
        Map.entry("level-auto", Route.post()),
        Map.entry("opt-set", Route.post(131072)),
        Map.entry("syllabus-import", Route.post(262144)),
        Map.entry("template-apply", Route.post()),
        Map.entry("template-save", Route.post()),
        Map.entry("template-del", Route.post()),
        Map.entry("copy", Route.post()),
        Map.entry("shift", Route.post()),
        Map.entry("backup", Route.post()),
        Map.entry("backup-import", Route.post(8388608)),
        Map.entry("backup-del", Route.post()),
        Map.entry("restore", Route.post()),
        Map.entry("file-put", Route.post(4608000)),
        Map.entry("scorm-pkg", Route.post(262144)),
        Map.entry("scorm-file-put", Route.post(7340032)),
        Map.entry("scorm-commit", Route.post(524288)),
        Map.entry("menu-set", Route.post(16384)),
        Map.entry("menu-pref", Route.post(16384)));
    private final LmsBMapper mapper; private final LmsBcdCore core;
    public LmsBServiceImpl(LmsBMapper mapper, LmsBcdCore core) { this.mapper = mapper; this.core = core; }

    @Override public Object call(String op, HttpServletRequest req, byte[] body) throws Exception {
        Route rt = ROUTES.get(op);
        if (rt == null || !rt.method().equals(req.getMethod())) throw new DdException(404, "없는 주소입니다.", "not_found");
        return core.handle(core.who(req), "b", op, rt, req, body, (o, x) -> mapper.api(o, x[0], x[1]));
    }
}
