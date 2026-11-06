package egovframework.didisam.cmm;

import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/** v30 학사 LMS 묶음 컨트롤러(egovframework.didisam.lms.*)의 /api/lms/ 경로를 DdApiFilter.LMS에 모은다.
 *  Node lms/index.js가 mod-*.js 라우트를 자동으로 붙이는 것과 같은 역할. */
@Component
public class DdLmsRoutes implements ApplicationListener<ContextRefreshedEvent> {
    @Override
    public void onApplicationEvent(ContextRefreshedEvent ev) {
        ev.getApplicationContext().getBeansOfType(RequestMappingHandlerMapping.class).values().forEach(hm -> {
            for (RequestMappingInfo info : hm.getHandlerMethods().keySet()) {
                for (String p : info.getDirectPaths()) {
                    if (!p.startsWith("/api/lms/")) continue;
                    for (RequestMethod rm : info.getMethodsCondition().getMethods()) DdApiFilter.LMS.add(rm.name() + " " + p);
                }
            }
        });
    }
}
