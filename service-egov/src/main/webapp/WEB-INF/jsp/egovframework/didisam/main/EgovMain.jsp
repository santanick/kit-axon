<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>디디쌤 스튜디오</title>
<style>
 :root{--bg:#f6f7f9;--fg:#1d2433;--mute:#5b6577;--card:#fff;--line:#e3e6eb;--pri:#3b5bdb}
 @media (prefers-color-scheme:dark){:root{--bg:#14171c;--fg:#e8eaee;--mute:#a3abb8;--card:#1c2027;--line:#2c313a;--pri:#7c95f0}}
 body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
 main{max-width:560px;margin:48px auto;padding:0 16px}
 .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:24px}
 h1{font-size:20px;margin:0 0 4px} p{margin:6px 0;color:var(--mute)} dl{display:grid;grid-template-columns:96px 1fr;gap:6px 12px;margin:16px 0}
 dt{color:var(--mute)} dd{margin:0} a.btn{display:inline-block;margin-top:12px;background:var(--pri);color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px}
 small{display:block;margin-top:16px;color:var(--mute)}
</style>
</head>
<body><main><div class="card">
 <h1>디디쌤 스튜디오</h1>
 <c:choose>
  <c:when test="${not empty me}">
   <p>로그인되어 있습니다.</p>
   <dl>
    <dt>기관</dt><dd id="orgName"><c:out value="${me.tenant.name}"/></dd>
    <dt>운영자</dt><dd><c:out value="${me.user.email}"/> (<c:out value="${me.user.role}"/>)</dd>
    <dt>기관 번호</dt><dd><c:out value="${me.tenant.tid}"/></dd>
   </dl>
   <a class="btn" href="/index.html">스튜디오 열기</a>
  </c:when>
  <c:otherwise>
   <p>로그인이 필요합니다. 로그인 상태는 최대 <c:out value="${sessionDays}"/>일 유지됩니다.</p>
   <a class="btn" href="/index.html">로그인 · 기관 가입</a>
  </c:otherwise>
 </c:choose>
 <small><c:out value="${edition}"/></small>
</div></main></body></html>
