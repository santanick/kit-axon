package egovframework.didisam.fac.service.impl;

import egovframework.didisam.cmm.DdException;
import java.util.Map;

/** 덧붙일 값이 있는 오류(FacErrAdvice가 응답에 펼친다) */
public class FacErr extends DdException {
    public final Map<String, Object> extra;
    public FacErr(int status, String code, String message, Map<String, Object> extra) { super(status, message, code); this.extra = extra; }
}
