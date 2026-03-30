// Quick test for Zalo Cloud utility functions
import {
  normalizeVietnamesePhone,
  mapZaloReplyStatus,
  mapZaloDeliveryStatus,
} from "./src/lib/zalo-cloud.ts";

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

// normalizeVietnamesePhone
test("0xxx → 84xxx", normalizeVietnamesePhone("0901234567"), "84901234567");
test("84xxx unchanged", normalizeVietnamesePhone("84901234567"), "84901234567");
test("bare number → 84xxx", normalizeVietnamesePhone("901234567"), "84901234567");
test("removes dashes", normalizeVietnamesePhone("090-123-4567"), "84901234567");

// mapZaloReplyStatus
test("P → answered", mapZaloReplyStatus("P"), "answered");
test("N → missed", mapZaloReplyStatus("N"), "missed");
test("Z → failed", mapZaloReplyStatus("Z"), "failed");
test("unknown → failed", mapZaloReplyStatus("X"), "failed");

// mapZaloDeliveryStatus
test("Received", mapZaloDeliveryStatus("Received"), "Đã nhận");
test("Seen", mapZaloDeliveryStatus("Seen"), "Đã xem");
test("Unknown", mapZaloDeliveryStatus("Unknown"), "Không xác định");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
