package egovframework.didisam;

import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

/** 외장 WAS(Tomcat 10.1 · JEUS 9 등 Jakarta EE 10) 배포용 진입점 — war를 WAS에 올리면 이 클래스로 기동한다 */
public class ServletInitializer extends SpringBootServletInitializer {
    @Override protected SpringApplicationBuilder configure(SpringApplicationBuilder b) { return b.sources(EgovDidisamApplication.class); }
}
