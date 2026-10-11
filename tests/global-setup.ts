import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default function setup() {
  const db = path.join(__dirname, "..", "prisma", "test.db");
  if (fs.existsSync(db)) fs.rmSync(db);
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
}
