import { applyFacebookGroupMigrations } from "./apply-facebook-group-migrations.mjs";

if (!process.argv.includes("--confirm-production")) {
  throw new Error("Thêm --confirm-production để xác nhận chạy migration production.");
}

const connectionString = process.env.DATABASE_PUBLIC_URL
  || process.env.POSTGRESQL_URL
  || process.env.DATABASE_URL;
const migrationName = "007_add_facebook_group_ai_operations.sql";
const result = await applyFacebookGroupMigrations({
  connectionString,
  migrationNames: [migrationName],
});
if (result.applied.length) {
  console.log(`Applied ${migrationName}.`);
} else {
  console.log(`${migrationName} was already applied.`);
}
