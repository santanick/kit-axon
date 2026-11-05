/* 전자정부 표준프레임워크 실행환경 5.0 호환 shim — 기본(local) 빌드 전용. -Pegov 빌드에서는 컴파일에서 빠지고 실제 RTE 클래스가 쓰인다.
   공개 API 시그니처는 egovframe-runtime v5.0.2-Final 소스와 같게 맞춘다(구현은 최소). */
package org.egovframe.rte.fdl.cmmn.exception;

import java.util.Locale;
import org.springframework.context.MessageSource;

public class BaseException extends Exception {
    protected String message; protected String messageKey; protected Object[] messageParameters; protected Exception wrappedException;
    public BaseException() { }
    public BaseException(String defaultMessage) { this.message = defaultMessage; }
    public BaseException(MessageSource messageSource, String messageKey, Object[] messageParameters, Locale locale, Throwable wrappedException) {
        super(wrappedException);
        this.messageKey = messageKey; this.messageParameters = messageParameters;
        this.message = messageSource.getMessage(messageKey, messageParameters, messageKey, locale == null ? Locale.getDefault() : locale);
        if (wrappedException instanceof Exception e) this.wrappedException = e;
    }
    @Override public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getMessageKey() { return messageKey; }
    public void setMessageKey(String messageKey) { this.messageKey = messageKey; }
    public Object[] getMessageParameters() { return messageParameters; }
    public void setMessageParameters(Object[] p) { this.messageParameters = p; }
    public Throwable getWrappedException() { return wrappedException; }
    public void setWrappedException(Exception e) { this.wrappedException = e; }
}
