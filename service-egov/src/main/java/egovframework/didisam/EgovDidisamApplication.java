package egovframework.didisam;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** 디디쌤 운영 서버 — 전자정부 표준프레임워크 에디션(시범 이식). Node 서버와 같은 /api 규격 · 같은 DB. */
@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
@MapperScan(basePackages = "egovframework.didisam", annotationClass = org.egovframe.rte.psl.dataaccess.mapper.EgovMapper.class)
public class EgovDidisamApplication {
    public static void main(String[] args) { SpringApplication.run(EgovDidisamApplication.class, args); }
}
