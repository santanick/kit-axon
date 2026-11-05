package egovframework.didisam.lms.m.service.impl;

import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.DdWeb;
import egovframework.didisam.lms.m.service.LmsMService;
import egovframework.didisam.lms.p.service.impl.LmsDispatch;
import jakarta.servlet.http.HttpServletRequest;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/** 묶음 M — 사용자 관리 · 사용자 전환 · 접속 통계 · 로그 검색 · 팝업/배너 · 시스템 모니터링(Node mod-m.js와 같은 지표 이름) */
@Service("lmsMService")
public class LmsMServiceImpl extends EgovAbstractServiceImpl implements LmsMService {
    private final LmsMMapper mapper; private final LmsDispatch d;
    public LmsMServiceImpl(LmsMMapper mapper, LmsDispatch d) { this.mapper = mapper; this.d = d; }

    /** 서버 지표 — /proc/loadavg · OperatingSystemMXBean · File(statfs 대응) · 힙 */
    public static ObjectNode metrics() {
        ObjectNode m = DdWeb.JSON.createObjectNode();
        double[] ld = { 0, 0, 0 };
        try { String[] a = Files.readString(Path.of("/proc/loadavg")).trim().split("\\s+"); for (int i = 0; i < 3; i++) ld[i] = Double.parseDouble(a[i]); }
        catch (Exception e) { ld[0] = Math.max(0, ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage()); }
        m.put("load1", ld[0]); m.put("load5", ld[1]); m.put("load15", ld[2]);
        m.put("cpus", Runtime.getRuntime().availableProcessors());
        if (ManagementFactory.getOperatingSystemMXBean() instanceof com.sun.management.OperatingSystemMXBean os) { m.put("mem_total", os.getTotalMemorySize()); m.put("mem_free", os.getFreeMemorySize()); }
        else { m.put("mem_total", 0); m.put("mem_free", 0); }
        Runtime rt = Runtime.getRuntime(); m.put("heap_used", rt.totalMemory() - rt.freeMemory()); m.put("heap_max", rt.maxMemory());
        File root = new File("/"); m.put("disk_total", root.getTotalSpace()); m.put("disk_free", root.getUsableSpace());
        m.put("uptime", ManagementFactory.getRuntimeMXBean().getUptime() / 1000); m.put("runtime", "java");
        return m;
    }

    @Override public ResponseEntity<String> run(String op, String method, byte[] body, HttpServletRequest req) throws Exception {
        LmsDispatch.Pre pre = "mon.sample".equals(op) ? (q, a, me) -> q.set("metrics", metrics()) : null;
        String out = d.run(mapper::call, op, method, body, req, pre, LmsDispatch.BODY_MAX);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(out);
    }
}
