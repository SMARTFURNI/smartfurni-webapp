import { applyFacebookGroupMigrations } from "./apply-facebook-group-migrations.mjs";

if (!process.argv.includes("--confirm-production")) {
  throw new Error("Thêm --confirm-production để xác nhận chạy migration production.");
}

const connectionString = process.env.DATABASE_PUBLIC_URL
  || process.env.POSTGRESQL_URL
  || process.env.DATABASE_URL;
const migrationNames = [
  "007_add_facebook_group_ai_operations.sql",
  "008_add_fanpage_ai_care_center.sql",
];
const result = await applyFacebookGroupMigrations({
  connectionString,
  migrationNames,
});
if (result.applied.length) {
  console.log(`Applied ${result.applied.join(", ")}.`);
} else {
  console.log(`${migrationNames.join(", ")} were already applied.`);
}
