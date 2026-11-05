package egovframework.didisam.bench.service;

import java.util.Map;

/** 홈페이지 벤치마크 읽기(POST /api/site/benchmark) — 운영자 세션 · https만 · 내부 주소 차단(SSRF) · 2MB · 10초 · 구조만 */
public interface BenchService {
    Map<String, Object> benchmark(Map<String, Object> a, byte[] body) throws Exception;
}
