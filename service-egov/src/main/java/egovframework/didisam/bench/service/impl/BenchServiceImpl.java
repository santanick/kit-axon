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
    private final DdOembed oembed;
    public BenchServiceImpl(DdRateLimiter rl, egovframework.didisam.cmm.DdProps dp) { this.rl = rl; this.oembed = new DdOembed(dp.prod); }
    @Override public Map<String, Object> oembed(Map<String, Object> a, String url) throws Exception { rl.limit("oembed:" + a.get("uid"), 60, 60_000L); return oembed.lookup(url); }

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
