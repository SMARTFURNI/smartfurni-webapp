#!/usr/bin/env python3
"""
SmartFurni CRM - Automated Auth & RBAC Test Suite
==================================================
Kiểm thử tự động toàn diện cho:
  1. Luồng đăng nhập admin (/admin/login)
  2. Luồng đăng nhập nhân viên (/crm-login)
  3. Phân quyền trang (page-level RBAC)
  4. Phân quyền API (API-level RBAC)
  5. Bảo mật session (logout, invalid token, expired)

Chạy: python3 scripts/auth-test.py [--base-url URL]
"""

import sys
import json
import time
import argparse
import requests
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

# ─── Config ────────────────────────────────────────────────────────────────────
DEFAULT_BASE_URL = "https://smartfurni-webapp-production.up.railway.app"

ADMIN_CREDENTIALS = {"username": "admin", "password": "smartfurni2026"}
STAFF_CREDENTIALS = {"username": "dunganh@smartfurni.vn", "password": "123456abc"}
WRONG_CREDENTIALS = {"username": "hacker", "password": "wrongpassword"}

# ─── Màu sắc terminal ──────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BLUE   = "\033[94m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
CYAN   = "\033[96m"

# ─── Data structures ──────────────────────────────────────────────────────────
@dataclass
class TestResult:
    name: str
    passed: bool
    expected: str
    actual: str
    note: str = ""

@dataclass
class TestSuite:
    name: str
    results: list = field(default_factory=list)

    def add(self, name, passed, expected, actual, note=""):
        self.results.append(TestResult(name, passed, expected, actual, note))

    @property
    def passed(self): return sum(1 for r in self.results if r.passed)
    @property
    def failed(self): return sum(1 for r in self.results if not r.passed)
    @property
    def total(self): return len(self.results)

# ─── Helpers ──────────────────────────────────────────────────────────────────
def get_session(base_url: str, endpoint: str, credentials: dict) -> Optional[requests.Session]:
    """Đăng nhập và trả về session có cookie."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    try:
        r = s.post(f"{base_url}{endpoint}", json=credentials, timeout=15, allow_redirects=False)
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                return s
    except Exception:
        pass
    return None

def check_page(session: requests.Session, base_url: str, path: str) -> int:
    """Kiểm tra HTTP status của page (không follow redirect)."""
    try:
        r = session.get(f"{base_url}{path}", timeout=15, allow_redirects=False)
        return r.status_code
    except Exception:
        return -1

def check_api(session: requests.Session, base_url: str, path: str, method="GET", body=None) -> int:
    """Kiểm tra HTTP status của API endpoint."""
    try:
        if method == "GET":
            r = session.get(f"{base_url}{path}", timeout=15)
        elif method == "POST":
            r = session.post(f"{base_url}{path}", json=body or {}, timeout=15)
        elif method == "PATCH":
            r = session.patch(f"{base_url}{path}", json=body or {}, timeout=15)
        return r.status_code
    except Exception:
        return -1

def get_redirect_location(session: requests.Session, base_url: str, path: str) -> str:
    """Lấy redirect location của page."""
    try:
        r = session.get(f"{base_url}{path}", timeout=15, allow_redirects=False)
        return r.headers.get("location", "")
    except Exception:
        return ""

# ─── Test Suites ──────────────────────────────────────────────────────────────

def test_admin_login(base_url: str) -> TestSuite:
    suite = TestSuite("Đăng nhập Admin (/admin/login)")

    # TC-A01: Đăng nhập đúng thông tin
    s = get_session(base_url, "/api/admin/login", ADMIN_CREDENTIALS)
    suite.add("TC-A01: Đăng nhập đúng thông tin", s is not None,
              "success: true", "session created" if s else "failed")

    # TC-A02: Đăng nhập sai mật khẩu
    s_wrong = requests.Session()
    r = s_wrong.post(f"{base_url}/api/admin/login",
                     json=WRONG_CREDENTIALS, timeout=15)
    suite.add("TC-A02: Đăng nhập sai mật khẩu", r.status_code == 401,
              "401 Unauthorized", str(r.status_code))

    # TC-A03: Đăng nhập thiếu username
    r2 = s_wrong.post(f"{base_url}/api/admin/login",
                      json={"username": "", "password": "abc"}, timeout=15)
    suite.add("TC-A03: Đăng nhập thiếu username", r2.status_code in [400, 401],
              "400 or 401", str(r2.status_code))

    # TC-A04: Đăng nhập thiếu password
    r3 = s_wrong.post(f"{base_url}/api/admin/login",
                      json={"username": "admin", "password": ""}, timeout=15)
    suite.add("TC-A04: Đăng nhập thiếu password", r3.status_code in [400, 401],
              "400 or 401", str(r3.status_code))

    # TC-A05: Truy cập CRM sau khi đăng nhập admin
    if s:
        status = check_page(s, base_url, "/crm")
        suite.add("TC-A05: Admin truy cập /crm sau đăng nhập", status == 200,
                  "200", str(status))

    # TC-A06: Truy cập /admin/login khi đã đăng nhập → redirect
    if s:
        loc = get_redirect_location(s, base_url, "/admin/login")
        suite.add("TC-A06: Admin đã đăng nhập → /admin/login redirect", "/crm" in loc or loc != "",
                  "redirect to /crm", loc or "no redirect")

    # TC-A07: Đăng xuất admin
    if s:
        r_logout = s.get(f"{base_url}/admin/logout", allow_redirects=False, timeout=15)
        suite.add("TC-A07: Đăng xuất admin", r_logout.status_code in [200, 302, 307],
                  "200/302/307", str(r_logout.status_code))
        # Sau đăng xuất, truy cập /crm phải redirect
        status_after = check_page(s, base_url, "/crm")
        suite.add("TC-A08: Sau đăng xuất admin, /crm bị chặn", status_after in [302, 307],
                  "302/307 redirect", str(status_after))

    return suite


def test_staff_login(base_url: str) -> TestSuite:
    suite = TestSuite("Đăng nhập Nhân viên (/crm-login)")

    # TC-S01: Trang /crm-login hiển thị
    r = requests.get(f"{base_url}/crm-login", timeout=15)
    suite.add("TC-S01: Trang /crm-login hiển thị", r.status_code == 200,
              "200", str(r.status_code))

    # TC-S02: Đăng nhập đúng thông tin
    s = get_session(base_url, "/api/crm/staff/login", STAFF_CREDENTIALS)
    suite.add("TC-S02: Đăng nhập nhân viên đúng thông tin", s is not None,
              "success: true", "session created" if s else "failed")

    # TC-S03: Đăng nhập sai mật khẩu
    s_wrong = requests.Session()
    r_wrong = s_wrong.post(f"{base_url}/api/crm/staff/login",
                           json={"username": STAFF_CREDENTIALS["username"], "password": "wrongpw"},
                           timeout=15)
    suite.add("TC-S03: Đăng nhập sai mật khẩu", r_wrong.status_code == 401,
              "401", str(r_wrong.status_code))

    # TC-S04: Đăng nhập username không tồn tại
    r_nouser = s_wrong.post(f"{base_url}/api/crm/staff/login",
                            json={"username": "notexist@test.com", "password": "abc123"},
                            timeout=15)
    suite.add("TC-S04: Đăng nhập username không tồn tại", r_nouser.status_code == 401,
              "401", str(r_nouser.status_code))

    # TC-S05: Đăng nhập thiếu body
    r_empty = s_wrong.post(f"{base_url}/api/crm/staff/login", json={}, timeout=15)
    suite.add("TC-S05: Đăng nhập thiếu credentials", r_empty.status_code in [400, 401],
              "400 or 401", str(r_empty.status_code))

    # TC-S06: Nhân viên truy cập /crm sau đăng nhập
    if s:
        status = check_page(s, base_url, "/crm")
        suite.add("TC-S06: Nhân viên truy cập /crm sau đăng nhập", status == 200,
                  "200", str(status))

    # TC-S07: Đăng xuất nhân viên
    if s:
        r_logout = s.post(f"{base_url}/api/crm/staff/logout", timeout=15)
        suite.add("TC-S07: Đăng xuất nhân viên", r_logout.status_code == 200,
                  "200", str(r_logout.status_code))
        # Sau đăng xuất, truy cập /crm phải redirect
        status_after = check_page(s, base_url, "/crm")
        suite.add("TC-S08: Sau đăng xuất nhân viên, /crm bị chặn", status_after in [302, 307],
                  "302/307 redirect", str(status_after))

    # TC-S09: Không có session → /crm redirect về /crm-login
    anon = requests.Session()
    loc = get_redirect_location(anon, base_url, "/crm")
    suite.add("TC-S09: Không có session → /crm redirect về /crm-login",
              "crm-login" in loc or "crm-login" in loc,
              "redirect to /crm-login", loc or "no redirect")

    # TC-S10: Invalid session token bị từ chối
    fake_session = requests.Session()
    fake_session.cookies.set("sf_crm_staff_session", "invalid-token-xyz", domain=base_url.split("//")[1])
    status_fake = check_page(fake_session, base_url, "/crm")
    suite.add("TC-S10: Invalid session token bị từ chối", status_fake in [302, 307],
              "302/307 redirect", str(status_fake))

    return suite


def test_staff_page_rbac(base_url: str) -> TestSuite:
    suite = TestSuite("Phân quyền Trang - Nhân viên (senior_sales)")

    # Đăng nhập nhân viên
    s_staff = get_session(base_url, "/api/crm/staff/login", STAFF_CREDENTIALS)
    if not s_staff:
        suite.add("SETUP: Đăng nhập nhân viên", False, "success", "failed - skip all")
        return suite

    # Trang nhân viên ĐƯỢC phép truy cập
    allowed_pages = [
        ("/crm",                "Dashboard"),
        ("/crm/leads",          "Danh sách KH"),
        ("/crm/kanban",         "Bảng Kanban"),
        ("/crm/calendar",       "Lịch hẹn"),
        ("/crm/contracts",      "Hợp đồng"),
        ("/crm/notifications",  "Nhắc nhở"),
        ("/crm/nps",            "Khảo sát NPS"),
        ("/crm/zalo",           "Zalo OA"),
        ("/crm/products",       "Sản phẩm"),
        ("/crm/profile",        "Hồ sơ cá nhân"),
    ]
    for path, label in allowed_pages:
        status = check_page(s_staff, base_url, path)
        suite.add(f"TC-P01 [{label}] Nhân viên được truy cập {path}", status == 200,
                  "200", str(status))

    # Trang nhân viên KHÔNG được phép (admin-only)
    blocked_pages = [
        ("/crm/staff",          "Quản lý nhân viên"),
        ("/crm/settings",       "Cài đặt CRM"),
        ("/crm/audit",          "Nhật ký hoạt động"),
        ("/crm/permissions",    "Phân quyền"),
        ("/crm/automation",     "Automation Rules"),
        ("/crm/reports",        "Báo cáo"),
        ("/crm/email",          "Email Marketing"),
        ("/crm/import-export",  "Import/Export"),
    ]
    for path, label in blocked_pages:
        status = check_page(s_staff, base_url, path)
        suite.add(f"TC-P02 [{label}] Nhân viên bị chặn {path}", status in [302, 307],
                  "302/307 redirect", str(status))

    return suite


def test_admin_page_rbac(base_url: str) -> TestSuite:
    suite = TestSuite("Phân quyền Trang - Admin")

    # Đăng nhập admin
    s_admin = get_session(base_url, "/api/admin/login", ADMIN_CREDENTIALS)
    if not s_admin:
        suite.add("SETUP: Đăng nhập admin", False, "success", "failed - skip all")
        return suite

    # Admin được truy cập TẤT CẢ trang CRM
    all_pages = [
        ("/crm",               "Dashboard"),
        ("/crm/leads",         "Danh sách KH"),
        ("/crm/kanban",        "Bảng Kanban"),
        ("/crm/calendar",      "Lịch hẹn"),
        ("/crm/contracts",     "Hợp đồng"),
        ("/crm/notifications", "Nhắc nhở"),
        ("/crm/nps",           "NPS"),
        ("/crm/zalo",          "Zalo OA"),
        ("/crm/products",      "Sản phẩm"),
        ("/crm/staff",         "Quản lý nhân viên"),
        ("/crm/settings",      "Cài đặt CRM"),
        ("/crm/audit",         "Nhật ký"),
        ("/crm/permissions",   "Phân quyền"),
        ("/crm/automation",    "Automation"),
        ("/crm/reports",       "Báo cáo"),
        ("/crm/email",         "Email Marketing"),
        ("/crm/import-export", "Import/Export"),
    ]
    for path, label in all_pages:
        status = check_page(s_admin, base_url, path)
        suite.add(f"TC-A [{label}] Admin được truy cập {path}", status == 200,
                  "200", str(status))

    return suite


def test_api_rbac(base_url: str) -> TestSuite:
    suite = TestSuite("Phân quyền API")

    s_staff = get_session(base_url, "/api/crm/staff/login", STAFF_CREDENTIALS)
    s_admin = get_session(base_url, "/api/admin/login", ADMIN_CREDENTIALS)
    s_anon  = requests.Session()

    # API nhân viên ĐƯỢC phép gọi
    staff_allowed_apis = [
        ("GET",  "/api/crm/leads",         "GET leads"),
        ("GET",  "/api/crm/contracts",      "GET contracts"),
        ("GET",  "/api/crm/notifications",  "GET notifications"),
        ("GET",  "/api/crm/appointments",   "GET appointments"),
        ("GET",  "/api/crm/nps",            "GET nps"),
        ("GET",  "/api/crm/staff/me",       "GET staff/me"),
    ]
    if s_staff:
        for method, path, label in staff_allowed_apis:
            status = check_api(s_staff, base_url, path, method)
            suite.add(f"TC-API01 [{label}] Staff được gọi {method} {path}",
                      status == 200, "200", str(status))

    # API nhân viên KHÔNG được phép (admin-only)
    staff_blocked_apis = [
        ("GET",  "/api/crm/staff",          "GET staff list"),
        ("GET",  "/api/crm/audit",          "GET audit log"),
        ("GET",  "/api/crm/permissions",    "GET permissions"),
        ("GET",  "/api/crm/settings",       "GET settings"),
        ("GET",  "/api/crm/automation",     "GET automation"),
    ]
    if s_staff:
        for method, path, label in staff_blocked_apis:
            status = check_api(s_staff, base_url, path, method)
            suite.add(f"TC-API02 [{label}] Staff bị chặn {method} {path}",
                      status in [401, 403], "401/403", str(status))

    # API không có session bị từ chối
    public_blocked_apis = [
        ("GET",  "/api/crm/leads",         "GET leads (no auth)"),
        ("GET",  "/api/crm/contracts",     "GET contracts (no auth)"),
        ("GET",  "/api/crm/staff",         "GET staff (no auth)"),
        ("GET",  "/api/crm/settings",      "GET settings (no auth)"),
    ]
    for method, path, label in public_blocked_apis:
        status = check_api(s_anon, base_url, path, method)
        suite.add(f"TC-API03 [{label}] Không có session bị từ chối",
                  status in [401, 403], "401/403", str(status))

    # Admin được gọi tất cả API
    admin_apis = [
        ("GET",  "/api/crm/staff",         "GET staff list"),
        ("GET",  "/api/crm/audit",         "GET audit"),
        ("GET",  "/api/crm/permissions",   "GET permissions"),
        ("GET",  "/api/crm/settings",      "GET settings"),
        ("GET",  "/api/crm/leads",         "GET leads"),
        ("GET",  "/api/crm/contracts",     "GET contracts"),
    ]
    if s_admin:
        for method, path, label in admin_apis:
            status = check_api(s_admin, base_url, path, method)
            suite.add(f"TC-API04 [{label}] Admin được gọi {method} {path}",
                      status == 200, "200", str(status))

    return suite


def test_session_security(base_url: str) -> TestSuite:
    suite = TestSuite("Bảo mật Session")

    # TC-SEC01: Không có cookie → bị chặn
    anon = requests.Session()
    status = check_page(anon, base_url, "/crm")
    suite.add("TC-SEC01: Không có cookie → /crm bị chặn", status in [302, 307],
              "302/307", str(status))

    # TC-SEC02: Cookie admin giả → bị từ chối
    fake_admin = requests.Session()
    fake_admin.cookies.set("sf_admin_session", "ZmFrZS10b2tlbi14eXo=",
                           domain=base_url.split("//")[1].split("/")[0])
    status2 = check_page(fake_admin, base_url, "/crm")
    suite.add("TC-SEC02: Cookie admin giả → bị từ chối", status2 in [302, 307],
              "302/307", str(status2))

    # TC-SEC03: Cookie staff giả → bị từ chối
    fake_staff = requests.Session()
    fake_staff.cookies.set("sf_crm_staff_session", "fake-uuid-token-xyz",
                           domain=base_url.split("//")[1].split("/")[0])
    status3 = check_page(fake_staff, base_url, "/crm")
    suite.add("TC-SEC03: Cookie staff giả → bị từ chối", status3 in [302, 307],
              "302/307", str(status3))

    # TC-SEC04: API staff/me không có session → 401
    status4 = check_api(anon, base_url, "/api/crm/staff/me")
    suite.add("TC-SEC04: GET /api/crm/staff/me không có session → 401/redirect",
              status4 in [401, 302, 307], "401/302/307", str(status4))

    # TC-SEC05: Staff không thể xem staff list
    s_staff = get_session(base_url, "/api/crm/staff/login", STAFF_CREDENTIALS)
    if s_staff:
        status5 = check_api(s_staff, base_url, "/api/crm/staff")
        suite.add("TC-SEC05: Staff không thể GET /api/crm/staff (danh sách NV)",
                  status5 in [401, 403], "401/403", str(status5))

    # TC-SEC06: Staff không thể xóa nhân viên khác
    if s_staff:
        status6 = check_api(s_staff, base_url, "/api/crm/staff/some-id", "PATCH",
                            {"fullName": "Hacked"})
        suite.add("TC-SEC06: Staff không thể PATCH /api/crm/staff/{id}",
                  status6 in [401, 403], "401/403", str(status6))

    return suite


# ─── Runner & Report ──────────────────────────────────────────────────────────

def print_suite(suite: TestSuite):
    print(f"\n{BOLD}{BLUE}{'─'*60}{RESET}")
    print(f"{BOLD}{BLUE}  {suite.name}{RESET}")
    print(f"{BOLD}{BLUE}{'─'*60}{RESET}")
    for r in suite.results:
        icon = f"{GREEN}✅{RESET}" if r.passed else f"{RED}❌{RESET}"
        status = f"{GREEN}PASS{RESET}" if r.passed else f"{RED}FAIL{RESET}"
        print(f"  {icon} {status}  {r.name}")
        if not r.passed:
            print(f"       {YELLOW}Expected: {r.expected} | Got: {r.actual}{RESET}")
        elif r.note:
            print(f"       {CYAN}Note: {r.note}{RESET}")
    print(f"\n  {GREEN}{suite.passed} passed{RESET} / {RED}{suite.failed} failed{RESET} / {suite.total} total")


def main():
    parser = argparse.ArgumentParser(description="SmartFurni CRM Auth Test Suite")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL của webapp")
    parser.add_argument("--suite", default="all",
                        choices=["all", "admin-login", "staff-login", "staff-rbac", "admin-rbac", "api", "security"],
                        help="Chọn test suite cụ thể")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  SmartFurni CRM - Auth & RBAC Test Suite{RESET}")
    print(f"{BOLD}  Base URL: {base_url}{RESET}")
    print(f"{BOLD}  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    suites = []

    if args.suite in ("all", "admin-login"):
        print(f"\n{CYAN}[1/5] Đang chạy: Đăng nhập Admin...{RESET}")
        suites.append(test_admin_login(base_url))

    if args.suite in ("all", "staff-login"):
        print(f"{CYAN}[2/5] Đang chạy: Đăng nhập Nhân viên...{RESET}")
        suites.append(test_staff_login(base_url))

    if args.suite in ("all", "staff-rbac"):
        print(f"{CYAN}[3/5] Đang chạy: Phân quyền trang - Nhân viên...{RESET}")
        suites.append(test_staff_page_rbac(base_url))

    if args.suite in ("all", "admin-rbac"):
        print(f"{CYAN}[4/5] Đang chạy: Phân quyền trang - Admin...{RESET}")
        suites.append(test_admin_page_rbac(base_url))

    if args.suite in ("all", "api"):
        print(f"{CYAN}[5/5] Đang chạy: Phân quyền API...{RESET}")
        suites.append(test_api_rbac(base_url))

    if args.suite in ("all", "security"):
        print(f"{CYAN}[+] Đang chạy: Bảo mật Session...{RESET}")
        suites.append(test_session_security(base_url))

    # In kết quả từng suite
    for suite in suites:
        print_suite(suite)

    # Tổng kết
    total_passed = sum(s.passed for s in suites)
    total_failed = sum(s.failed for s in suites)
    total_all    = sum(s.total  for s in suites)
    pass_rate    = (total_passed / total_all * 100) if total_all > 0 else 0

    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  TỔNG KẾT{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")
    print(f"  Tổng test cases : {total_all}")
    print(f"  {GREEN}Passed          : {total_passed}{RESET}")
    print(f"  {RED}Failed          : {total_failed}{RESET}")
    print(f"  Pass rate       : {pass_rate:.1f}%")

    if total_failed == 0:
        print(f"\n  {GREEN}{BOLD}✅ Tất cả test cases PASSED!{RESET}")
    else:
        print(f"\n  {RED}{BOLD}❌ Có {total_failed} test case(s) FAILED!{RESET}")
        print(f"  {YELLOW}Xem chi tiết ở trên để biết test nào cần sửa.{RESET}")

    print(f"{BOLD}{'='*60}{RESET}\n")

    # Exit code: 0 nếu pass hết, 1 nếu có fail
    sys.exit(0 if total_failed == 0 else 1)


if __name__ == "__main__":
    main()
