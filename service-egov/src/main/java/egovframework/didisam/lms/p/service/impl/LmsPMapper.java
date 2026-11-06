package egovframework.didisam.lms.p.service.impl;

import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface LmsPMapper {
    /** SQL 디스패처 lms_p(op, me, q) — 결과 jsonb를 문자열로 */
    String call(@Param("op") String op, @Param("me") String me, @Param("q") String q);
    /** 관리자 2차 로그인: 운영자 비밀번호 해시(기관 역할 밖, plain) */
    String selectPw(@Param("uid") String uid);
    /** 학습자 앱 세션(learner_sessions) — tid · sid */
    Map<String, Object> selectLearner(@Param("hash") String hash);
}
