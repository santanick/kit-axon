package egovframework.didisam.cmm;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 고정 창 제한(인스턴스 단위) — Node 서버 limit()과 같은 규칙 */
@Component
public class DdRateLimiter {
    private static final class W { int n; long reset; }
    private final ConcurrentHashMap<String, W> map = new ConcurrentHashMap<>();
    public void limit(String key, int max, long winMs) {
        long now = System.currentTimeMillis();
        W w = map.compute(key, (k, e) -> { if (e == null || e.reset < now) { e = new W(); e.reset = now + winMs; } e.n++; return e; });
        if (w.n > max) throw new DdException(429, "시도가 너무 많습니다. 잠시 후 다시 시도하세요.", "rate");
    }
    @Scheduled(fixedDelay = 60000)
    public void sweep() { long now = System.currentTimeMillis(); map.entrySet().removeIf(e -> e.getValue().reset < now); }
}
