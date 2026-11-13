package egovframework.didisam.fac.web;

import egovframework.didisam.fac.service.FacService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** v40 운영자 /api/fac/* (02 명세 5-2) — 권한 · 교강사 범위 · 키오스크 토큰은 서비스가 판정한다. 등록 경로는 DdApiFilter.FAC */
@RestController
@RequestMapping("/api/fac")
public class FacController {
    private final FacService fac;
    public FacController(FacService fac) { this.fac = fac; }
    private Object go(HttpServletRequest q, HttpServletResponse r, String op, String id, byte[] b) throws Exception { return fac.admin(q, r, op, id, b); }

    @GetMapping("/overview") public Object overview(HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET overview", null, null); }
    @GetMapping("/bookings") public Object bookings(HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET bookings", null, null); }
    @PostMapping("/bookings") public Object book(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST bookings", null, b); }
    @GetMapping("/bookings/{id}") public Object booking(@PathVariable String id, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET bookings/id", id, null); }
    @PostMapping("/bookings/{id}/{act:approve|reject|cancel}") public Object bkAct(@PathVariable String id, @PathVariable String act, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST bookings/" + act, id, b); }
    @PostMapping("/closures") public Object closures(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST closures", null, b); }
    @PostMapping("/checkin") public Object checkin(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST checkin", null, b); }
    @PostMapping("/kiosk/start") public Object kiosk(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST kiosk/start", null, b); }
    @PostMapping("/payments") public Object payments(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST payments", null, b); }
    @GetMapping("/refunds") public Object refunds(HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET refunds", null, null); }
    @PostMapping("/refunds") public Object refund(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST refunds", null, b); }
    @PostMapping("/rentals/{id}/{act:lend|return}") public Object rental(@PathVariable String id, @PathVariable String act, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST rentals/" + act, id, b); }
    @PostMapping("/passes") public Object passes(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST passes", null, b); }
    @PostMapping("/passes/{id}/adjust") public Object adjust(@PathVariable String id, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST passes/adjust", id, b); }
    @GetMapping("/noshow") public Object noshow(HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET noshow", null, null); }
    @PostMapping("/noshow/{id}/restore") public Object restore(@PathVariable String id, @RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "POST noshow/restore", id, b); }
    @GetMapping("/stats") public Object stats(HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET stats", null, null); }
    @GetMapping("/export") public Object export(HttpServletRequest q, HttpServletResponse r) throws Exception { return go(q, r, "GET export", null, null); }
}
