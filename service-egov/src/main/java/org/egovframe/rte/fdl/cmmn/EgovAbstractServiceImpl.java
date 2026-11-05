package org.egovframe.rte.fdl.cmmn;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 전자정부 표준프레임워크 실행환경(org.egovframe.rte.fdl.cmmn) 호환 shim.
 * 기본(local) 빌드에서만 쓰고, -Pegov 빌드에서는 컴파일에서 빠지고 실제 RTE 5.0 클래스가 쓰인다.
 * 서비스 구현체는 표준프레임워크 규약대로 이 클래스를 상속한다.
 */
public abstract class EgovAbstractServiceImpl {
    protected final Logger egovLogger = LoggerFactory.getLogger(getClass());
}
