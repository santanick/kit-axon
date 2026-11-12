package egovframework.didisam.lms.v.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** v32 미디어 — SQL 함수 호출(fn은 고정 라우트 표 · 작업기 단계 이름만) · 객체 바이트 · 대기열 */
@EgovMapper
public interface LmsVMapper {
    String call(@Param("fn") String fn, @Param("ctx") String ctx, @Param("a") String a);
    Map<String, Object> selectData(@Param("mid") String mid, @Param("path") String path);
    /** 객체 바이트(없으면 null) */
    default byte[] data(String mid, String path) { Map<String, Object> r = selectData(mid, path); return r == null ? null : (byte[]) r.get("data"); }
    /** 묶음 E 파일 저장소(lms_file) 바이트 — x2 실시간 수업 음성 조각 */
    Map<String, Object> selectFile(@Param("id") String id);
    String selectStore(@Param("mid") String mid, @Param("path") String path);
    int putObj(@Param("mid") String mid, @Param("path") String path, @Param("mime") String mime, @Param("size") long size, @Param("store") String store, @Param("data") byte[] data);
    Map<String, Object> claim(@Param("worker") String worker);
    int deleteQ(@Param("job") String job);
    List<String> univTenants();
}
