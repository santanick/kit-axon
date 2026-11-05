package egovframework.didisam.cmm;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface TenantTxMapper {
    void setTenantRole();
    String setTenant(@Param("tid") String tid);
    void insertAudit(@Param("tid") String tid, @Param("actor") String actor, @Param("action") String action, @Param("detail") String detail);
}
