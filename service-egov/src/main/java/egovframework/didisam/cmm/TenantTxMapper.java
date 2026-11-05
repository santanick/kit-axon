package egovframework.didisam.cmm;

import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;
import org.apache.ibatis.annotations.Param;

@EgovMapper
public interface TenantTxMapper {
    void setTenantRole();
    /** 신원(pii 스키마) 전용 역할 — learner 데이터 표 권한 없음 */
    void setPiiRole();
    String setTenant(@Param("tid") String tid);
    void insertAudit(@Param("tid") String tid, @Param("actor") String actor, @Param("action") String action, @Param("detail") String detail);
}
