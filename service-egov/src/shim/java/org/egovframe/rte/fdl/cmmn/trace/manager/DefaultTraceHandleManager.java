/* 전자정부 표준프레임워크 실행환경 5.0 호환 shim — 기본(local) 빌드 전용. -Pegov 빌드에서는 컴파일에서 빠지고 실제 RTE 클래스가 쓰인다.
   공개 API 시그니처는 egovframe-runtime v5.0.2-Final 소스와 같게 맞춘다(구현은 최소). */
package org.egovframe.rte.fdl.cmmn.trace.manager;

import org.egovframe.rte.fdl.cmmn.trace.handler.TraceHandler;
import org.springframework.util.PathMatcher;

public class DefaultTraceHandleManager implements TraceHandlerService {
    protected String packageName; protected String[] patterns = {}; protected TraceHandler[] handlers = {}; protected PathMatcher pm;
    public void setPatterns(String[] patterns) { this.patterns = patterns; }
    public void setHandlers(TraceHandler[] handlers) { this.handlers = handlers; }
    public void setPackageName(String n) { this.packageName = n; }
    public void setReqExpMatcher(PathMatcher pm) { this.pm = pm; }
    public boolean hasReqExpMatcher() { return pm != null; }
    public boolean trace(Class<?> clazz, String message) {
        if (pm == null) return false;
        for (String p : patterns) if (pm.match(p, packageName)) { for (TraceHandler h : handlers) h.todo(clazz, message); break; }
        return true;
    }
}
