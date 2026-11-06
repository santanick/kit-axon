package egovframework.didisam.lms.o.service.impl;

import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Map;
import org.springframework.aop.framework.Advised;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

/** x2 실시간 자막 번역 · 요약(lms.live)이 묶음 O의 LLM 경로(제공자 · 한도 · 개인정보 가림 · 호출 기록)를 그대로 쓰게 하는 다리. Node는 ctx.lmsoLlm. */
@Component
public class LmsOLlmBridge {
    public record Out(String text, ObjectNode ai) { }
    private final ApplicationContext ctx; private volatile LmsOServiceImpl o;
    public LmsOLlmBridge(ApplicationContext ctx) { this.ctx = ctx; }
    private LmsOServiceImpl svc() throws Exception {
        if (o == null) { Object b = ctx.getBean("lmsOService"); if (b instanceof Advised ad) b = ad.getTargetSource().getTarget(); o = (LmsOServiceImpl) b; }
        return o;
    }
    public Out call(Map<String, Object> a, String feature, String system, String user, double temperature, int max) throws Exception {
        LmsOServiceImpl.Llm r = svc().llm(a, feature, system, user, temperature, max, null);
        return new Out(r.text(), r.ai());
    }
}
