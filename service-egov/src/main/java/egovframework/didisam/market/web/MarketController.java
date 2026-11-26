package egovframework.didisam.market.web;

import egovframework.didisam.market.service.MarketService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

/** 콘텐츠 마켓 /api/market/* — Node market.match(method, path)처럼 경로 표 · 권한 · 오류 코드는 서비스가 판정한다. 등록 경로는 DdApiFilter.MARKET */
@RestController
@RequestMapping("/api/market")
public class MarketController {
    private final MarketService mk;
    public MarketController(MarketService mk) { this.mk = mk; }
    @RequestMapping(value = "/**", method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE })
    public Object any(@RequestBody(required = false) byte[] b, HttpServletRequest q, HttpServletResponse r) throws Exception { return mk.admin(q, r, b); }
}
