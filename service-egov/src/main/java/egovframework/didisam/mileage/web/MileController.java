package egovframework.didisam.mileage.web;

import egovframework.didisam.mileage.service.MileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** v42 학습 마일리지 운영자 /api/mileage/* (docs/mileage/04-data-api.md 5.1) — 권한 · 기관 플래그 · 오류 코드는 서비스가 판정한다. 등록 경로는 DdApiFilter.MILEAGE */
@RestController
@RequestMapping("/api/mileage")
public class MileController {
    private final MileService mil;
    public MileController(MileService mil) { this.mil = mil; }
    private Object go(HttpServletRequest q, HttpServletResponse r, String op, String id, byte[] b) throws Exception { return mil.admin(q, r, op, id, b); }

    @GetMapping("/{name:config|summary|entries|wallet|approvals|redeems|flags|proofs|log}") public Object get(@PathVariable String name, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET " + name, null, null); }
    @GetMapping("/shop/payouts") public Object payouts(HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET shop/payouts", null, null); }
    @PostMapping("/{name:config|onoff|rank-penalty|funded|rules|draft|simulate|enable|events|grant|cancel|rewards|sunset|import-q}") public Object post(@PathVariable String name, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST " + name, null, b); }
    @PostMapping("/{a:approvals|redeems|flags|proofs}/{x:decide|cancel|handed|resolve}") public Object post2(@PathVariable String a, @PathVariable String x, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST " + a + "/" + x, null, b); }
    @PostMapping("/shop/payouts/send") public Object send(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST shop/payouts/send", null, b); }
}
