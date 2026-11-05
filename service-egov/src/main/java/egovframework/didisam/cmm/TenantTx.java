package egovframework.didisam.cmm;

import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 기관 범위 트랜잭션(Node db.js inTenant와 같음): 한 트랜잭션 안에서
 *   set local role didisam_tenant + set_config('app.tenant', tid, true) → RLS로 이 기관 행만 보인다.
 * tenants · users · sessions · learner_sessions는 이 역할에 권한이 없으므로 inTenant 밖(plain)에서 다룬다.
 */
@Component
public class TenantTx {
    private final TenantTxMapper m;
    public TenantTx(TenantTxMapper m) { this.m = m; }

    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public <T> T inTenant(String tid, Supplier<T> fn) {
        m.setTenantRole(); m.setTenant(tid);
        return fn.get();
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public <T> T plain(Supplier<T> fn) { return fn.get(); }

    /** 감사 기록(기관 범위) — 자기 호출은 프록시를 거치지 않으므로 역할 설정을 직접 한다 */
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void audit(String tid, String actor, String action, String detailJson) {
        m.setTenantRole(); m.setTenant(tid); m.insertAudit(tid, actor, action, detailJson);
    }
}
