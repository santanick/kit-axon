/* Semgrep 규칙 시험 예제(실행 코드 아님) */
class Ex {
    java.util.Set<String> selfSids(String tid, String b) throws Exception {
        // ruleid: didisam-rls-missing-tenant-java
        return tx.plain(() -> q("select learner_id::text id from pii.identity where tid = $1 and email_bidx = $2", tid, b));
    }
    void sim() throws Exception {
        // ok: didisam-rls-missing-tenant-java
        tx.plain(() -> { x("set local role didisam_tenant"); x("select set_config('app.tenant', $1, true)", st); x("insert into mil_policy (tenant_id) values ($1)", st); return null; });
    }
    java.util.Set<String> ok1(String tid, String b) throws Exception {
        // ok: didisam-rls-missing-tenant-java
        return ptx.run(tid, rr -> rr.P(() -> q("select learner_id::text id from pii.identity where tid = $1", tid)));
    }
    // ruleid: didisam-owner-check-missing-java
    @GetMapping("/staff") public Map<String, Object> list(HttpServletRequest req) throws Exception { return authService.staffList(authService.needStaff(req)); }


    // ok: didisam-owner-check-missing-java
    @GetMapping("/staff") public Map<String, Object> list2(HttpServletRequest req) throws Exception { return authService.staffList(authService.needOwner(req)); }


    // ruleid: didisam-hardcoded-secret-literal
    String key = "sk-ant-api03-BBBBBBBBBBBBBBBBBBBBBBBBBBBB";
    // ruleid: didisam-secret-weak-fallback-java
    @Value("${SESSION_PEPPER:didisam-learner}") String pepper;
    // ok: didisam-secret-weak-fallback-java
    @Value("${SESSION_PEPPER:}") String pepper2;
}
