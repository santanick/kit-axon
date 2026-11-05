/* 전자정부 표준프레임워크 실행환경 5.0 호환 shim — 기본(local) 빌드 전용. -Pegov 빌드에서는 컴파일에서 빠지고 실제 RTE 클래스가 쓰인다.
   공개 API 시그니처는 egovframe-runtime v5.0.2-Final 소스와 같게 맞춘다(구현은 최소). */
package org.egovframe.rte.fdl.cmmn;

import jakarta.annotation.Resource;
import java.util.Locale;
import org.egovframe.rte.fdl.cmmn.exception.EgovBizException;
import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;

public abstract class EgovAbstractServiceImpl {
    protected Logger egovLogger = LoggerFactory.getLogger(getClass());
    @Resource(name = "messageSource") private MessageSource messageSource;
    @Resource(name = "leaveaTrace") private LeaveaTrace traceObj;

    protected Exception processException(final String msgKey) { return processException(msgKey, new String[]{}); }
    protected Exception processException(final String msgKey, Exception exception) { return processException(msgKey, new String[]{}, exception); }
    protected Exception processException(final String msgKey, final String[] msgArgs) { return processException(msgKey, msgArgs, null); }
    protected Exception processException(final String msgKey, final String[] msgArgs, final Exception exception) { return processException(msgKey, msgArgs, exception, LocaleContextHolder.getLocale()); }
    protected Exception processException(final String msgKey, final String[] msgArgs, final Exception exception, Locale locale) {
        return new EgovBizException(messageSource, msgKey, msgArgs, locale, exception);
    }
    protected void leaveaTrace(String msgKey) { leaveaTrace(msgKey, new String[]{}); }
    protected void leaveaTrace(String msgKey, String[] msgArgs) { leaveaTrace(msgKey, msgArgs, null); }
    protected void leaveaTrace(String msgKey, String[] msgArgs, Locale locale) { traceObj.trace(this.getClass(), messageSource, msgKey, msgArgs, locale, egovLogger); }
}
