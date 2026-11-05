package egovframework.didisam.pub.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** 학습자 포털 /api/pub/{tid}/{act} (Node app.js pubRoute · tutorRoute와 같은 규격) */
public interface PubService {
    Object route(HttpServletRequest req, HttpServletResponse res, String tid, String act, byte[] body) throws Exception;
}
