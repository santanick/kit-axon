/* 전자정부 표준프레임워크 실행환경 5.0 호환 shim — 기본(local) 빌드 전용. -Pegov 빌드에서는 컴파일에서 빠지고 실제 RTE 클래스가 쓰인다.
   공개 API 시그니처는 egovframe-runtime v5.0.2-Final 소스와 같게 맞춘다(구현은 최소). */
package org.egovframe.rte.fdl.cmmn.trace;

import java.util.Locale;
import org.egovframe.rte.fdl.cmmn.trace.manager.TraceHandlerService;
import org.slf4j.Logger;
import org.springframework.context.MessageSource;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.PathMatcher;

public class LeaveaTrace {
    private final PathMatcher pm = new AntPathMatcher();
    private TraceHandlerService[] traceHandlerServices;
    public void setTraceHandlerServices(TraceHandlerService[] s) { this.traceHandlerServices = s.clone(); }
    public int countOfTheTraceHandlerService() { return traceHandlerServices != null ? traceHandlerServices.length : 0; }
    public void trace(Class<?> clazz, MessageSource messageSource, String messageKey, Object[] messageParameters, Locale locale, Logger LOGGER) {
        String message = messageSource.getMessage(messageKey, messageParameters, messageKey, locale == null ? Locale.getDefault() : locale);
        if (traceHandlerServices == null) return;
        for (TraceHandlerService t : traceHandlerServices) { if (!t.hasReqExpMatcher()) t.setReqExpMatcher(pm); t.setPackageName(clazz.getCanonicalName()); t.trace(clazz, message); }
    }
}
