package egovframework.didisam.ledger.web;

import egovframework.didisam.ledger.service.LedgerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** v41 통합 수납 원장 운영자 /api/ledger/* (09 규격 3절) — 권한 · 기관 플래그 · 오류 코드는 서비스가 판정한다. 등록 경로는 DdApiFilter.LEDGER */
@RestController
@RequestMapping("/api/ledger")
public class LedgerController {
    private final LedgerService led;
    public LedgerController(LedgerService led) { this.led = led; }
    private Object go(HttpServletRequest q, HttpServletResponse r, String op, String id, byte[] b) throws Exception { return led.admin(q, r, op, id, b); }

    @GetMapping("/{name:units|summary|entries|refunds|share|close|today|export|devices}") public Object get(@PathVariable String name, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET " + name, null, null); }
    @PostMapping("/{name:units|charges|receipts|refunds|links|import|close|devices|device-push}") public Object post(@PathVariable String name, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST " + name, null, b); }
    @PostMapping("/charges/generate") public Object gen(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST charges/generate", null, b); }
    @PostMapping("/receipts/{id}/correct") public Object correct(@PathVariable String id, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST receipts/correct", id, b); }
    @PostMapping("/refunds/{id}/confirm") public Object confirm(@PathVariable String id, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST refunds/confirm", id, b); }
}
