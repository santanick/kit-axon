package egovframework.didisam.cmm;

import java.util.concurrent.ConcurrentHashMap;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** 고정 창 제한(인스턴스 단위) — Node 서버 limit()과 같은 규칙. 초과 시 업무 예외(dd.429.rate) */
@Service("rateLimitService")
public class DdRateLimiter extends EgovAbstractServiceImpl {
    private static final class W { int n; long reset; }
    private final ConcurrentHashMap<String, W> map = new ConcurrentHashMap<>();
    public void limit(String key, int max, long winMs) throws Exception { limit(key, (double) max, winMs); }
    /** 한도가 소수 · NaN일 수 있는 경우(Node: ++n > max 비교 그대로) */
    public void limit(String key, double max, long winMs) throws Exception {
        long now = System.currentTimeMillis();
        W w = map.compute(key, (k, e) -> { if (e == null || e.reset < now) { e = new W(); e.reset = now + winMs; } e.n++; return e; });
        if (w.n > max) throw processException("dd.429.rate");
    }
    @Scheduled(fixedDelay = 60000)
    public void sweep() { long now = System.currentTimeMillis(); map.entrySet().removeIf(e -> e.getValue().reset < now); }
}
