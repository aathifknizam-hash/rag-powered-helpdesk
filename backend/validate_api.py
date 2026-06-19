"""Backend API validation script."""
import requests

BASE = "http://127.0.0.1:8000/api"
results = []


def test(name, fn):
    try:
        ok, detail = fn()
        results.append((name, ok, detail))
        return detail if ok and isinstance(detail, dict) else None
    except Exception as e:
        results.append((name, False, str(e)))
        return None


def auth_flow(email):
    r = requests.post(
        f"{BASE}/auth/login/",
        json={"email": email, "password": "password"},
        timeout=30,
    )
    if r.status_code != 200:
        return False, f"login {r.status_code}: {r.text[:200]}"
    data = r.json()
    if "access" not in data:
        return False, "no access token"
    refresh = data["refresh"]
    r2 = requests.post(f"{BASE}/auth/refresh/", json={"refresh": refresh}, timeout=30)
    if r2.status_code != 200:
        return False, f"refresh {r2.status_code}"
    headers = {"Authorization": f"Bearer {data['access']}"}
    r3 = requests.get(f"{BASE}/auth/me/", headers=headers, timeout=30)
    if r3.status_code != 200:
        return False, f"profile {r3.status_code}"
    if "user" not in data:
        return False, "login missing user payload"
    return True, headers


customer_headers = test("Auth (customer)", lambda: auth_flow("customer@faith.com"))
admin_headers = test("Auth (admin)", lambda: auth_flow("admin@example.com"))

if customer_headers:

    def tickets_test():
        r = requests.get(f"{BASE}/tickets/my_tickets/", headers=customer_headers, timeout=30)
        if r.status_code != 200:
            return False, r.text[:200]
        r2 = requests.post(
            f"{BASE}/tickets/",
            headers=customer_headers,
            json={
                "subject": "Validation test ticket",
                "description": "Automated validation test",
                "request_type": "it",
                "priority": "medium",
            },
            timeout=30,
        )
        if r2.status_code not in (200, 201):
            return False, f"create {r2.status_code}: {r2.text[:200]}"
        tid = r2.json().get("id")
        r3 = requests.get(f"{BASE}/tickets/{tid}/", headers=customer_headers, timeout=30)
        if r3.status_code != 200:
            return False, "get failed"
        r4 = requests.post(
            f"{BASE}/tickets/{tid}/messages/",
            headers=customer_headers,
            json={"content": "Test message"},
            timeout=30,
        )
        if r4.status_code not in (200, 201):
            return False, f"message {r4.status_code}"
        return True, f"ticket_id={tid}"

    test("Tickets CRUD + messages", tickets_test)

    def rag_test():
        r = requests.post(
            f"{BASE}/ai/search/",
            headers=customer_headers,
            json={"query": "How do I reset password?", "use_groq": False},
            timeout=60,
        )
        if r.status_code != 200:
            return False, r.text[:200]
        return True, r.json().get("status", "ok")

    test("RAG search", rag_test)

    def classify_test():
        r = requests.post(
            f"{BASE}/ai/classify/",
            headers=customer_headers,
            json={"subject": "VPN broken", "description": "Cannot connect to VPN"},
            timeout=30,
        )
        return r.status_code == 200, r.json().get("type", "")

    test("AI classification", classify_test)

    def kb_test():
        r = requests.get(f"{BASE}/knowledge_base/documents/", headers=customer_headers, timeout=30)
        return r.status_code == 200, "ok"

    test("Knowledge base list", kb_test)

if admin_headers:

    def admin_stats():
        r = requests.get(f"{BASE}/admin/stats/stats/", headers=admin_headers, timeout=30)
        return r.status_code == 200, r.text[:80]

    test("Admin stats", admin_stats)

    def audit_logs():
        r = requests.get(f"{BASE}/admin/audit-logs/", headers=admin_headers, timeout=30)
        return r.status_code == 200, "ok"

    test("Audit logs", audit_logs)

if __name__ == "__main__":
    passed = sum(1 for _, ok, _ in results if ok)
    for name, ok, detail in results:
        status = "PASS" if ok else "FAIL"
        print(f"{status}: {name} -> {detail}")
    print(f"\n{passed}/{len(results)} tests passed")
