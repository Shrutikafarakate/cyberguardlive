import socket
import ssl
from datetime import datetime, timezone
from urllib.parse import urlparse
import httpx


async def check_ssl_certificate(hostname: str, port: int = 443) -> dict:
    """
    Connects to hostname over SSL/TLS and extracts certificate details.
    """
    ssl_context = ssl.create_default_context()
    
    try:
        with socket.create_connection((hostname, port), timeout=5.0) as sock:
            with ssl_context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                if not cert:
                    return {
                        "ssl_valid": False,
                        "status": "No Certificate",
                        "expiry_date": "N/A",
                        "days_remaining": 0,
                        "issuer": "Unknown",
                    }

                # Parse notAfter date e.g. "May 15 23:59:59 2026 GMT"
                not_after_str = cert.get("notAfter")
                expiry_dt = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                now_dt = datetime.now(timezone.utc)
                days_remaining = (expiry_dt - now_dt).days

                # Issuer organization
                issuer_info = cert.get("issuer", ())
                issuer_name = "Unknown"
                for item in issuer_info:
                    for key, val in item:
                        if key == "organizationName":
                            issuer_name = val
                            break

                if days_remaining <= 0:
                    status = "Expired"
                    ssl_valid = False
                elif days_remaining <= 30:
                    status = "Expiring Soon"
                    ssl_valid = True
                else:
                    status = "Valid"
                    ssl_valid = True

                return {
                    "ssl_valid": ssl_valid,
                    "status": status,
                    "expiry_date": expiry_dt.strftime("%Y-%m-%d"),
                    "days_remaining": max(0, days_remaining),
                    "issuer": issuer_name,
                }
    except Exception as exc:
        return {
            "ssl_valid": False,
            "status": f"Invalid ({type(exc).__name__})",
            "expiry_date": "N/A",
            "days_remaining": 0,
            "issuer": "None",
        }


async def inspect_api_security(api_name: str, url: str) -> dict:
    """
    Performs comprehensive security inspection for an API URL.
    Checks SSL certificate and security HTTP headers.
    """
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    hostname = parsed.hostname or ""

    vulnerabilities_found = 0
    header_issues = []
    score = 100

    # 1. Check Protocol & SSL
    if scheme != "https":
        ssl_info = {
            "ssl_valid": False,
            "status": "HTTP (Insecure)",
            "expiry_date": "N/A",
            "days_remaining": 0,
            "issuer": "None",
        }
        score -= 40
        vulnerabilities_found += 1
        header_issues.append("Unencrypted HTTP protocol used")
    else:
        ssl_info = await check_ssl_certificate(hostname, parsed.port or 443)
        if not ssl_info["ssl_valid"]:
            score -= 35
            vulnerabilities_found += 1
        elif ssl_info["status"] == "Expiring Soon":
            score -= 10

    # 2. Check Security Headers via HTTP request
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.head(url)
            if resp.status_code >= 400:
                resp = await client.get(url)
            
            headers = {k.lower(): v for k, v in resp.headers.items()}

            # HSTS check
            if scheme == "https" and "strict-transport-security" not in headers:
                score -= 10
                vulnerabilities_found += 1
                header_issues.append("Missing HSTS header")

            # X-Content-Type-Options
            if "x-content-type-options" not in headers:
                score -= 10
                vulnerabilities_found += 1
                header_issues.append("Missing X-Content-Type-Options header")

            # X-Frame-Options / CSP
            if "x-frame-options" not in headers and "content-security-policy" not in headers:
                score -= 10
                vulnerabilities_found += 1
                header_issues.append("Missing Clickjacking protection (X-Frame-Options / CSP)")

    except Exception:
        # If site is unreachable or times out during header check
        score -= 15
        vulnerabilities_found += 1
        header_issues.append("Server response failed security headers verification")

    final_score = max(0, min(100, score))

    return {
        "api_name": api_name,
        "url": url,
        "ssl_status": ssl_info["status"],
        "ssl_valid": ssl_info["ssl_valid"],
        "expiry": ssl_info["expiry_date"],
        "days_remaining": ssl_info["days_remaining"],
        "issuer": ssl_info["issuer"],
        "vulnerabilities": vulnerabilities_found,
        "header_issues": header_issues,
        "score": final_score,
    }
