/* 전자정부 표준프레임워크 실행환경 5.0 호환 shim — 기본(local) 빌드 전용. -Pegov 빌드에서는 컴파일에서 빠지고 실제 RTE 클래스가 쓰인다.
   공개 API 시그니처는 egovframe-runtime v5.0.2-Final 소스와 같게 맞춘다(구현은 최소). */
package org.egovframe.rte.fdl.property.impl;

import java.util.HashMap;
import java.util.Map;
import org.egovframe.rte.fdl.property.EgovPropertyService;

public class EgovPropertyServiceImpl implements EgovPropertyService {
    private final Map<String, String> p = new HashMap<>();
    public void setProperties(Map<?, ?> properties) { properties.forEach((k, v) -> p.put(String.valueOf(k), String.valueOf(v))); }
    private String req(String n) { String v = p.get(n); if (v == null) throw new IllegalArgumentException("no property: " + n); return v; }
    public boolean getBoolean(String n) { return Boolean.parseBoolean(req(n)); }
    public boolean getBoolean(String n, boolean d) { return p.containsKey(n) ? Boolean.parseBoolean(p.get(n)) : d; }
    public int getInt(String n) { return Integer.parseInt(req(n)); }
    public int getInt(String n, int d) { return p.containsKey(n) ? Integer.parseInt(p.get(n)) : d; }
    public long getLong(String n) { return Long.parseLong(req(n)); }
    public long getLong(String n, long d) { return p.containsKey(n) ? Long.parseLong(p.get(n)) : d; }
    public String getString(String n) { return req(n); }
    public String getString(String n, String d) { return p.getOrDefault(n, d); }
    public void destroy() { p.clear(); }
}
