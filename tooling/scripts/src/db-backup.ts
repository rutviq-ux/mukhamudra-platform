/**
 * Database Backup Script
 *
 * Creates a timestamped pg_dump backup of the PostgreSQL database.
 * Supports local file storage and optional upload to S3-compatible storage.
 *
 * Usage:
 *   pnpm --dir tooling/scripts tsx src/db-backup.ts
 *
 * Environment Variables:
 *   DATABASE_URL          - PostgreSQL connection string (required)
 *   BACKUP_DIR            - Local directory for backups (default: ./backups)
 *   BACKUP_RETENTION_DAYS - Days to keep old backups (default: 30)
 *   BACKUP_S3_BUCKET      - S3 bucket for remote backup (optional)
 *   BACKUP_S3_REGION      - S3 region (optional, default: ap-south-1)
 */

import { execFileSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";
import { spawn } from "child_process";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 30);

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function cleanOldBackups(dir: string, retentionDays: number) {
  const now = Date.now();
  const maxAge = retentionDays * 24 * 60 * 60 * 1000;

  const files = readdirSync(dir).filter((f) => f.endsWith(".sql.gz") || f.endsWith(".dump"));
  let removed = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = statSync(filePath);
    if (now - stat.mtimeMs > maxAge) {
      unlinkSync(filePath);
      removed++;
      console.log(`  Removed old backup: ${file}`);
    }
  }

  if (removed > 0) {
    console.log(`Cleaned ${removed} old backup(s)`);
  }
}

function runPgDump(dbUrl: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pgDump = spawn("pg_dump", [
      dbUrl,
      "--no-owner",
      "--no-acl",
      "--clean",
      "--if-exists",
    ]);

    const gzip = createGzip();
    const output = createWriteStream(outputPath);

    pgDump.stdout.pipe(gzip).pipe(output);

    pgDump.stderr.on("data", (data: Buffer) => {
      console.error(`pg_dump: ${data.toString()}`);
    });

    output.on("finish", resolve);
    pgDump.on("error", reject);
    pgDump.on("exit", (code) => {
      if (code !== 0) reject(new Error(`pg_dump exited with code ${code}`));
    });
  });
}

async function main() {
  console.log("=== Mukha Mudra Database Backup ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  ensureDir(BACKUP_DIR);

  const timestamp = getTimestamp();
  const filename = `mukha-mudra-${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log(`\nCreating backup: ${filename}`);

  try {
    await runPgDump(DATABASE_URL, filepath);

    const stat = statSync(filepath);
    const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`Backup created: ${filepath} (${sizeMB} MB)`);

    // Upload to S3 if configured
    const s3Bucket = process.env.BACKUP_S3_BUCKET;
    if (s3Bucket) {
      const region = process.env.BACKUP_S3_REGION || "ap-south-1";
      console.log(`\nUploading to s3://${s3Bucket}/${filename}`);
      execFileSync("aws", [
        "s3", "cp", filepath,
        `s3://${s3Bucket}/db-backups/${filename}`,
        "--region", region,
      ], { stdio: "inherit", timeout: 300_000 });
      console.log("Upload complete");
    }

    // Clean old backups
    console.log(`\nCleaning backups older than ${RETENTION_DAYS} days...`);
    cleanOldBackups(BACKUP_DIR, RETENTION_DAYS);

    console.log("\nBackup completed successfully");
  } catch (error) {
    console.error("Backup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
