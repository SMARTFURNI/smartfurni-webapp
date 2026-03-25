#!/usr/bin/env python3
"""
SmartFurni CRM — Color Audit Script
Phát hiện các pattern màu sắc dark theme còn sót lại trong light theme.
Chạy từ thư mục gốc dự án: python3 scripts/color-audit.py
"""
import re, glob, sys, os

COMPONENT_DIR = "src/components/crm"
PATTERNS = [
    # CRITICAL: Chữ vô hình trên nền trắng
    (r'color:\s*["\']rgba\(255,255,255,0\.[0-9]+\)["\']', "CRITICAL", "Invisible text color (rgba white on white)"),
    (r'(?<!["\w-])text-white(?![\w-])', "CRITICAL", "text-white class (may be invisible on white bg)"),
    (r'placeholder-white', "HIGH", "Invisible placeholder text"),
    # HIGH: Viền/nền quá nhạt
    (r'border.*rgba\(255,255,255,0\.0[0-9]\)', "HIGH", "Near-invisible border"),
    (r'background.*rgba\(255,255,255,0\.0[0-2]\)', "HIGH", "Near-invisible background"),
    # MEDIUM: Dark hex backgrounds
    (r'#(?:161820|1a1f2e|0d0f14|080806|0a0c10|0f1117|12141a|1c1f2e|1e2230)', "MEDIUM", "Dark background hex color"),
    (r'\bbg-gray-900\b|\bbg-gray-800\b|\bbg-zinc-900\b|\bbg-slate-900\b', "MEDIUM", "Dark Tailwind background class"),
]

# Các trường hợp ngoại lệ hợp lệ (text-white trên nền màu đậm là OK)
WHITELIST_PATTERNS = [
    r'bg-(?:emerald|red|blue|green|yellow|purple|indigo|pink|orange|primary|black|gray-[7-9]00)',
    r'bg-\[#[0-9a-fA-F]{6}\]',  # bg-[#hexcolor]
    r'//.*text-white',  # comment
]

def is_whitelisted(line: str) -> bool:
    for wp in WHITELIST_PATTERNS:
        if re.search(wp, line):
            return True
    return False

def run_audit():
    if not os.path.isdir(COMPONENT_DIR):
        print(f"❌ Directory not found: {COMPONENT_DIR}")
        print("   Please run from the project root directory.")
        sys.exit(2)

    files = glob.glob(f"{COMPONENT_DIR}/**/*.tsx", recursive=True)
    issues = []

    for filepath in sorted(files):
        with open(filepath, encoding="utf-8") as f:
            lines = f.readlines()
        for lineno, line in enumerate(lines, 1):
            for pattern, severity, desc in PATTERNS:
                if re.search(pattern, line):
                    if severity == "CRITICAL" and "text-white" in pattern and is_whitelisted(line):
                        continue  # Skip valid text-white on colored backgrounds
                    issues.append((severity, filepath, lineno, desc, line.strip()))

    if not issues:
        print("✅ No color issues found! CRM is clean for light theme.")
        return 0

    # Group by severity
    by_severity = {"CRITICAL": [], "HIGH": [], "MEDIUM": []}
    for item in issues:
        by_severity[item[0]].append(item)

    print(f"⚠️  Found {len(issues)} potential color issues:\n")
    for severity in ["CRITICAL", "HIGH", "MEDIUM"]:
        group = by_severity[severity]
        if not group:
            continue
        icon = "🔴" if severity == "CRITICAL" else "🟠" if severity == "HIGH" else "🟡"
        print(f"{icon} {severity} ({len(group)} issues):")
        for _, filepath, lineno, desc, line in group:
            short_path = filepath.replace(COMPONENT_DIR + "/", "")
            print(f"   {short_path}:{lineno} — {desc}")
            print(f"   → {line[:120]}")
        print()

    critical = len(by_severity["CRITICAL"])
    high = len(by_severity["HIGH"])
    if critical > 0:
        print(f"❌ {critical} CRITICAL + {high} HIGH issues must be fixed before release.")
        return 1
    elif high > 0:
        print(f"⚠️  {high} HIGH issues should be reviewed.")
        return 0
    else:
        print(f"ℹ️  {len(by_severity['MEDIUM'])} MEDIUM issues (low risk, review when possible).")
        return 0

if __name__ == "__main__":
    sys.exit(run_audit())
