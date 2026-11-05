package egovframework.didisam.cmm;

import java.util.LinkedHashMap;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.egovframe.rte.fdl.cmmn.trace.handler.DefaultTraceHandler;
import org.egovframe.rte.fdl.cmmn.trace.handler.TraceHandler;
import org.egovframe.rte.fdl.cmmn.trace.manager.DefaultTraceHandleManager;
import org.egovframe.rte.fdl.cmmn.trace.manager.TraceHandlerService;
import org.egovframe.rte.fdl.idgnr.impl.EgovUUIdGnrServiceImpl;
import org.egovframe.rte.fdl.property.impl.EgovPropertyServiceImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.util.AntPathMatcher;

/**
 * 전자정부 표준프레임워크 공통 설정(context-common · context-properties · context-idgen 해당).
 *  - messageSource : 업무 오류 문구(egovframework/message/message-common)
 *  - leaveaTrace   : EgovAbstractServiceImpl.processException()의 추적 처리
 *  - propertiesService : 세션 · 저장 한도 · 시도 제한 등 운영 값(EgovPropertyService)
 *  - egovIdGnrService  : 오류 추적 번호(UUID)
 */
@Configuration
public class EgovConfigCommon {
    @Bean(name = "messageSource")
    public ReloadableResourceBundleMessageSource messageSource() {
        ReloadableResourceBundleMessageSource m = new ReloadableResourceBundleMessageSource();
        m.setBasenames("classpath:/egovframework/message/message-common");
        m.setDefaultEncoding("UTF-8"); m.setFallbackToSystemLocale(false); m.setCacheSeconds(60);
        return m;
    }
    @Bean public AntPathMatcher antPathMatcher() { return new AntPathMatcher(); }
    @Bean public DefaultTraceHandler defaultTraceHandler() { return new DefaultTraceHandler(); }
    @Bean public DefaultTraceHandleManager traceHandlerService(AntPathMatcher pm, DefaultTraceHandler h) {
        DefaultTraceHandleManager m = new DefaultTraceHandleManager();
        m.setReqExpMatcher(pm); m.setPatterns(new String[]{"*"}); m.setHandlers(new TraceHandler[]{h});
        return m;
    }
    @Bean(name = "leaveaTrace") public LeaveaTrace leaveaTrace(DefaultTraceHandleManager t) {
        LeaveaTrace l = new LeaveaTrace(); l.setTraceHandlerServices(new TraceHandlerService[]{t}); return l;
    }
    @Bean(name = "propertiesService", destroyMethod = "destroy")
    public EgovPropertyServiceImpl propertiesService() {
        EgovPropertyServiceImpl p = new EgovPropertyServiceImpl();
        Map<String, String> m = new LinkedHashMap<>();
        m.put("session.days", "14");
        m.put("state.maxBytes", String.valueOf(8 * 1024 * 1024));
        m.put("body.signupMax", "16384"); m.put("body.loginMax", "4096");
        m.put("rate.signup.max", "10"); m.put("rate.signup.winMs", "3600000");
        m.put("rate.loginIp.max", "30"); m.put("rate.loginEmail.max", "8"); m.put("rate.login.winMs", "600000");
        m.put("learner.syncMax", "300"); m.put("learner.codesMax", "5000");
        p.setProperties(m);
        return p;
    }
    @Bean(name = "egovIdGnrService") public EgovUUIdGnrServiceImpl egovIdGnrService() { return new EgovUUIdGnrServiceImpl(); }
}
