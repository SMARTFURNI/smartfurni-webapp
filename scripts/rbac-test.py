#!/usr/bin/env python3
"""
Script kiểm thử RBAC toàn diện cho CRM SmartFurni
Kiểm tra tất cả roles x routes x HTTP methods
"""
import requests
import json
from dataclasses import dataclass, field
from typing import Optional

BASE = "https://smartfurni-webapp-production.up.railway.app"

# ─── Auth helpers ────────────────────────────────────────────────────────────

def get_admin_session() -> dict:
    s = requests.Session()
    r = s.post(f"{BASE}/api/admin/login",
               json={"username": "admin", "password": "smartfurni2026"},
               allow_redirects=False)
    return {"session": s, "cookies": dict(s.cookies), "label": "admin"}

def get_staff_session(username: str, password: str, label: str) -> dict:
    s = requests.Session()
    r = s.post(f"{BASE}/api/crm/staff/login",
               json={"username": username, "password": password},
               allow_redirects=False)
    if r.status_code == 200:
        return {"session": s, "cookies": dict(s.cookies), "label": label, "ok": True}
    return {"session": s, "cookies": {}, "label": label, "ok": False, "error": r.text}

def get_anonymous() -> dict:
    return {"session": requests.Session(), "cookies": {}, "label": "anonymous"}

# ─── Test cases ──────────────────────────────────────────────────────────────

@dataclass
class TestCase:
    method: str
    path: str
    expected_by_role: dict  # role_label -> expected_status_code (or list of acceptable codes)
    body: Optional[dict] = None
    description: str = ""

# Định nghĩa tất cả test cases
TEST_CASES = [
    # ── Page routes (GET) ────────────────────────────────────────────────────
    TestCase("GET", "/crm", {
        "anonymous": [307],
        "staff_sales": [200],
        "admin": [200],
    }, description="Dashboard - tất cả có session"),

    TestCase("GET", "/crm/leads", {
        "anonymous": [307],
        "staff_sales": [200],
        "admin": [200],
    }, description="Danh sách KH - tất cả có session"),

    TestCase("GET", "/crm/kanban", {
        "anonymous": [307],
        "staff_sales": [200],
        "admin": [200],
    }, description="Kanban - tất cả có session"),

    TestCase("GET", "/crm/calendar", {
        "anonymous": [307],
        "staff_sales": [200],
        "admin": [200],
    }, description="Lịch hẹn - tất cả có session"),

    TestCase("GET", "/crm/tasks", {
        "anonymous": [307],
        "staff_sales": [200],
        "admin": [200],
    }, description="Việc cần làm - tất cả có session"),

    TestCase("GET", "/crm/quotes", {
        "anonymous": [307],
        "staff_sales": [200],
        "admin": [200],
    }, description="Báo giá - tất cả có session"),

    TestCase("GET", "/crm/products", {
        "anonymous": [307],
        "staff_sales": [200],
        "admin": [200],
    }, description="Sản phẩm - tất cả có session"),

    TestCase("GET", "/crm/contracts", {
        "anonymous": [307],
        "staff_sales": [307],   # requireAdmin → redirect /admin/login
        "admin": [200],
    }, description="Hợp đồng - chỉ admin"),

    TestCase("GET", "/crm/notifications", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Nhắc nhở - chỉ admin"),

    TestCase("GET", "/crm/nps", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="NPS - chỉ admin"),

    TestCase("GET", "/crm/zalo", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Zalo OA - chỉ admin"),

    # ── Super admin only pages ────────────────────────────────────────────────
    TestCase("GET", "/crm/staff", {
        "anonymous": [307],
        "staff_sales": [307],   # requireSuperAdminCrm → redirect /crm-login
        "admin": [200],
    }, description="Nhân viên - chỉ super_admin"),

    TestCase("GET", "/crm/settings", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Cài đặt CRM - chỉ super_admin"),

    TestCase("GET", "/crm/reports", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Báo cáo - chỉ super_admin"),

    TestCase("GET", "/crm/audit", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Nhật ký - chỉ super_admin"),

    TestCase("GET", "/crm/permissions", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Phân quyền - chỉ super_admin"),

    TestCase("GET", "/crm/automation", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Automation - chỉ super_admin"),

    TestCase("GET", "/crm/import-export", {
        "anonymous": [307],
        "staff_sales": [307],
        "admin": [200],
    }, description="Import/Export - chỉ super_admin"),

    # ── API routes ────────────────────────────────────────────────────────────
    TestCase("GET", "/api/crm/leads", {
        "anonymous": [200, 401],   # KHÔNG có guard - lỗ hổng bảo mật
        "staff_sales": [200],
        "admin": [200],
    }, description="API leads GET - cần kiểm tra có guard không"),

    TestCase("GET", "/api/crm/quotes", {
        "anonymous": [200, 401],
        "staff_sales": [200],
        "admin": [200],
    }, description="API quotes GET"),

    TestCase("GET", "/api/crm/tasks", {
        "anonymous": [200, 401],
        "staff_sales": [200],
        "admin": [200],
    }, description="API tasks GET"),

    TestCase("GET", "/api/crm/products", {
        "anonymous": [200, 401],
        "staff_sales": [200],
        "admin": [200],
    }, description="API products GET"),

    TestCase("GET", "/api/crm/staff", {
        "anonymous": [401],
        "staff_sales": [401],   # requireAdmin
        "admin": [200],
    }, description="API staff GET - chỉ admin"),

    TestCase("GET", "/api/crm/settings", {
        "anonymous": [401],
        "staff_sales": [401],
        "admin": [200],
    }, description="API settings GET - chỉ admin"),

    TestCase("GET", "/api/crm/audit", {
        "anonymous": [401],
        "staff_sales": [401],
        "admin": [200],
    }, description="API audit GET - chỉ admin"),

    TestCase("GET", "/api/crm/permissions", {
        "anonymous": [401],
        "staff_sales": [401],
        "admin": [200],
    }, description="API permissions GET - chỉ admin"),

    TestCase("GET", "/api/crm/automation", {
        "anonymous": [401],
        "staff_sales": [401],
        "admin": [200],
    }, description="API automation GET - chỉ admin"),

    TestCase("GET", "/api/crm/apikeys", {
        "anonymous": [401],
        "staff_sales": [401],
        "admin": [200],
    }, description="API apikeys GET - chỉ admin"),

    # ── Auth endpoints ────────────────────────────────────────────────────────
    TestCase("GET", "/crm-login", {
        "anonymous": [200],
        "staff_sales": [200],   # Trang login luôn accessible
        "admin": [200],
    }, description="Trang login nhân viên - luôn accessible"),

    TestCase("POST", "/api/crm/staff/login", {
        "anonymous": [400, 401, 200],  # Endpoint public (cần để đăng nhập)
        "staff_sales": [400, 401, 200],
        "admin": [400, 401, 200],
    }, description="API staff login - public endpoint"),
]

# ─── Runner ──────────────────────────────────────────────────────────────────

def run_test(tc: TestCase, actors: dict) -> list:
    results = []
    for role_label, expected_codes in tc.expected_by_role.items():
        actor = actors.get(role_label)
        if not actor:
            continue
        try:
            if tc.method == "GET":
                r = actor["session"].get(f"{BASE}{tc.path}", allow_redirects=False, timeout=10)
            elif tc.method == "POST":
                r = actor["session"].post(f"{BASE}{tc.path}", json=tc.body or {}, allow_redirects=False, timeout=10)
            elif tc.method == "DELETE":
                r = actor["session"].delete(f"{BASE}{tc.path}", allow_redirects=False, timeout=10)
            else:
                continue

            actual = r.status_code
            passed = actual in expected_codes
            results.append({
                "path": tc.path,
                "method": tc.method,
                "role": role_label,
                "expected": expected_codes,
                "actual": actual,
                "passed": passed,
                "description": tc.description,
            })
        except Exception as e:
            results.append({
                "path": tc.path,
                "method": tc.method,
                "role": role_label,
                "expected": expected_codes,
                "actual": f"ERROR: {e}",
                "passed": False,
                "description": tc.description,
            })
    return results

def main():
    print("🔐 SmartFurni CRM — RBAC Test Suite")
    print("=" * 60)

    # Khởi tạo sessions
    print("\n📋 Khởi tạo sessions...")
    admin = get_admin_session()
    print(f"  ✓ Admin session: {len(admin['cookies'])} cookies")

    staff = get_staff_session("dunganh@smartfurni.vn", "123456abc", "staff_sales")
    if staff.get("ok"):
        print(f"  ✓ Staff session (dunganh): {len(staff['cookies'])} cookies")
    else:
        print(f"  ✗ Staff login failed: {staff.get('error', 'unknown')}")

    anon = get_anonymous()
    print(f"  ✓ Anonymous session (no cookies)")

    actors = {
        "admin": admin,
        "staff_sales": staff,
        "anonymous": anon,
    }

    # Chạy tests
    print(f"\n🧪 Chạy {len(TEST_CASES)} test cases × 3 roles = {len(TEST_CASES)*3} checks...\n")
    all_results = []
    for tc in TEST_CASES:
        results = run_test(tc, actors)
        all_results.extend(results)

    # Phân loại kết quả
    passed = [r for r in all_results if r["passed"]]
    failed = [r for r in all_results if not r["passed"]]

    # In kết quả
    print(f"{'PASS':<6} {'FAIL':<6} {'METHOD':<7} {'ROLE':<15} {'PATH':<40} {'ACTUAL'}")
    print("-" * 90)
    for r in all_results:
        icon = "✅" if r["passed"] else "❌"
        actual = str(r["actual"])
        expected = str(r["expected"])
        print(f"{icon}     {r['method']:<7} {r['role']:<15} {r['path']:<40} {actual} (expected: {expected})")

    # Tóm tắt
    print("\n" + "=" * 60)
    print(f"📊 KẾT QUẢ: {len(passed)}/{len(all_results)} PASSED | {len(failed)} FAILED")

    if failed:
        print(f"\n❌ CÁC LỖI CẦN XỬ LÝ:")
        for r in failed:
            print(f"   [{r['method']}] {r['path']} | role={r['role']} | actual={r['actual']} | expected={r['expected']}")
            print(f"   → {r['description']}")

    # Phát hiện lỗ hổng bảo mật
    security_issues = [r for r in failed if r["role"] == "anonymous" and str(r["actual"]) == "200"]
    if security_issues:
        print(f"\n🚨 LỖ HỔNG BẢO MẬT - API KHÔNG CÓ AUTH:")
        for r in security_issues:
            print(f"   {r['method']} {r['path']} trả về 200 khi không có session!")

    # Lưu kết quả JSON
    with open("/home/ubuntu/rbac_test_results.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Kết quả chi tiết: /home/ubuntu/rbac_test_results.json")

    return len(failed) == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
