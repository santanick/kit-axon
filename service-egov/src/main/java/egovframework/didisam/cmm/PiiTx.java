package egovframework.didisam.cmm;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 한 트랜잭션 · 두 역할(Node pii.js tx와 같음): L = didisam_tenant(학습 · 운영 데이터), P = didisam_pii(신원 · pii 스키마만).
 * 같은 커넥션에서 SET LOCAL ROLE을 바꿔 가며 쓴다(서로의 표는 권한상 볼 수 없음). app.tenant는 처음 한 번 설정한다.
 */
@Component
public class PiiTx {
    @FunctionalInterface public interface Work<T> { T run(Roles r) throws Exception; }
    @FunctionalInterface public interface Q<T> { T run() throws Exception; }
    private final TenantTxMapper m;
    public PiiTx(TenantTxMapper m) { this.m = m; }

    /** 역할 전환기 — L(…) / P(…) 안에서 실행하는 쿼리는 해당 역할로 돈다 */
    public static final class Roles {
        private final TenantTxMapper m; private String role = "";
        Roles(TenantTxMapper m) { this.m = m; }
        public <T> T L(Q<T> q) throws Exception { if (!"t".equals(role)) { m.setTenantRole(); role = "t"; } return q.run(); }
        public <T> T P(Q<T> q) throws Exception { if (!"p".equals(role)) { m.setPiiRole(); role = "p"; } return q.run(); }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public <T> T run(String tid, Work<T> fn) throws Exception {
        m.setTenant(tid);
        return fn.run(new Roles(m));
    }
}
