"""
The visitor's real address, as far as it can be trusted.

Behind a hosting proxy, the socket address is the proxy's and the visitor's address is in the
X-Forwarded-For list. Anyone can put anything at the start of that list, so only the entries added by
proxies we run behind are trusted: each proxy appends the address it saw, so with N trusted proxies the
visitor is the N-th entry from the right. TRUSTED_PROXY_HOPS sets N. With 0 (local runs, no proxy) the
header is ignored entirely and the socket address is used.
"""
from starlette.requests import Request

from app.core.config import settings


def client_ip(request: Request) -> str:
    hops = max(int(settings.TRUSTED_PROXY_HOPS or 0), 0)
    if hops:
        chain = [part.strip() for part in request.headers.get("x-forwarded-for", "").split(",") if part.strip()]
        if len(chain) >= hops:
            return chain[-hops]
        if chain:
            return chain[0]  # fewer entries than proxies: the first is the closest we have
    return request.client.host if request.client else "unknown"
