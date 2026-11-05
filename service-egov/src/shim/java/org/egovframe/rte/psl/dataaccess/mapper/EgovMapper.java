/* 전자정부 표준프레임워크 실행환경 5.0 호환 shim — 기본(local) 빌드 전용. -Pegov 빌드에서는 컴파일에서 빠지고 실제 RTE 클래스가 쓰인다.
   공개 API 시그니처는 egovframe-runtime v5.0.2-Final 소스와 같게 맞춘다(구현은 최소). */
package org.egovframe.rte.psl.dataaccess.mapper;

import java.lang.annotation.*;
import org.springframework.stereotype.Component;

@Target({ElementType.TYPE}) @Retention(RetentionPolicy.RUNTIME) @Documented @Component
public @interface EgovMapper { String value() default ""; }
