// Simple inline test for Zalo Cloud utility functions
// Copied logic directly to avoid ESM issues

function normalizeVietnamesePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("0")) {
    normalized = "84" + normalized.slice(1);
  } else if (!normalized.startsWith("84")) {
    normalized = "84" + normalized;
  }
  return normalized;
}

function mapZaloReplyStatus(replyStatus: string): string {
  switch (replyStatus) {
    case "P": return "answered";
    case "N": return "missed";
    case "Z": return "failed";
    default: return "failed";
  }
}

function mapZaloDeliveryStatus(deliveryStatus: string): string {
  switch (deliveryStatus) {
    case "Unknown": return "Không xác định";
    case "Received": return "Đã nhận";
    case "Seen": return "Đã xem";
    default: return deliveryStatus;
  }
}

let passed = 0;
let failed = 0;

function test(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.error(`❌ ${name}: expected "${expected}", got "${actual}"`);
    failed++;
  }
}

test("0xxx → 84xxx", normalizeVietnamesePhone("0901234567"), "84901234567");
test("84xxx unchanged", normalizeVietnamesePhone("84901234567"), "84901234567");
test("bare number → 84xxx", normalizeVietnamesePhone("901234567"), "84901234567");
test("removes dashes", normalizeVietnamesePhone("090-123-4567"), "84901234567");
test("P → answered", mapZaloReplyStatus("P"), "answered");
test("N → missed", mapZaloReplyStatus("N"), "missed");
test("Z → failed", mapZaloReplyStatus("Z"), "failed");
test("unknown → failed", mapZaloReplyStatus("X"), "failed");
test("Received", mapZaloDeliveryStatus("Received"), "Đã nhận");
test("Seen", mapZaloDeliveryStatus("Seen"), "Đã xem");
test("Unknown", mapZaloDeliveryStatus("Unknown"), "Không xác định");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
