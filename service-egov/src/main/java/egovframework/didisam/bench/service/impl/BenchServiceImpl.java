package egovframework.didisam.bench.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import egovframework.didisam.bench.service.BenchService;
import egovframework.didisam.cmm.DdRateLimiter;
import egovframework.didisam.cmm.DdWeb;
import jakarta.annotation.Resource;
import java.util.Map;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.stereotype.Service;

@Service("benchService")
public class BenchServiceImpl extends EgovAbstractServiceImpl implements BenchService {
    @Resource(name = "propertiesService") private EgovPropertyService props;
    private final DdRateLimiter rl;
    public BenchServiceImpl(DdRateLimiter rl) { this.rl = rl; }

    @Override public Map<String, Object> benchmark(Map<String, Object> a, byte[] body) throws Exception {
        rl.limit("bench:" + a.get("tid"), props.getInt("rate.bench.max"), props.getLong("rate.bench.winMs"));
        JsonNode b = DdWeb.readBody(body, props.getInt("body.benchMax"));
        JsonNode u = b.get("url");
        if (u == null || !u.isTextual() || u.textValue().isEmpty()) throw processException("dd.400.bad_url");
        try {
            Map<String, Object> out = DdBench.benchmark(u.textValue());
            egovLogger.info("bench {} {}", a.get("tid"), String.valueOf(out.get("url")).replaceFirst("^https://([^/]*).*$", "$1"));
            return out;
        } catch (DdBench.Bad e) {
            throw e.arg != null ? processException(e.key(), new String[]{ e.arg }) : processException(e.key());
        } catch (Exception e) { throw processException("dd.502.fetch"); }
    }
}
