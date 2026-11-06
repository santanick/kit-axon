package egovframework.didisam.lms.p.web;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.lms.g.service.impl.LmsGLearnerCheckin;
import egovframework.didisam.lms.p.service.impl.LmsDispatch;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** 묶음 P 앱 출석 — 학습자 포털 세션으로 묶음 G 출석 체크인 실행(Node mod-p.js 'POST /api/lms/p/att/checkin'과 같음) */
@RestController
public class LmsPAttController {
    private final LmsDispatch d; private final LmsGLearnerCheckin ck;
    public LmsPAttController(LmsDispatch d, LmsGLearnerCheckin ck) { this.d = d; this.ck = ck; }
    @PostMapping("/api/lms/p/att/checkin") public JsonNode checkin(@RequestBody(required = false) byte[] body, HttpServletRequest req) throws Exception { return ck.run(d.learnerOf(req), req, body); }
}
