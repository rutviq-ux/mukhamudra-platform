/**
 * Create Razorpay Plans Script
 *
 * Creates 6 subscription plans on Razorpay and stores the returned plan IDs
 * back into the database. Run once per environment (test/production).
 *
 * Usage:
 *   pnpm razorpay:create-plans
 *
 * Required env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, DATABASE_URL
 */

import { prisma } from "@ru/db";
import Razorpay from "razorpay";

// ─── Config ──────────────────────────────────────────────

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error(
    "❌ Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment"
  );
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// Plans to create on Razorpay (subscription plans only — recording-addon uses Orders API)
const PLAN_DEFINITIONS = [
  {
    slug: "face-annual",
    razorpay: {
      period: "yearly" as const,
      interval: 1,
      item: {
        name: "Face Yoga Annual",
        amount: 300000, // ₹3,000 in paise
        currency: "INR",
        description: "Annual subscription — Group Face Yoga (Mon/Wed/Fri)",
      },
    },
  },
  {
    slug: "face-monthly",
    razorpay: {
      period: "monthly" as const,
      interval: 1,
      item: {
        name: "Face Yoga Monthly",
        amount: 111100, // ₹1,111 in paise
        currency: "INR",
        description: "Monthly subscription — Group Face Yoga (Mon/Wed/Fri)",
      },
    },
  },
  {
    slug: "pranayama-annual",
    razorpay: {
      period: "yearly" as const,
      interval: 1,
      item: {
        name: "Pranayama Annual",
        amount: 300000, // ₹3,000 in paise
        currency: "INR",
        description: "Annual subscription — Group Pranayama (Mon/Wed/Fri)",
      },
    },
  },
  {
    slug: "pranayama-monthly",
    razorpay: {
      period: "monthly" as const,
      interval: 1,
      item: {
        name: "Pranayama Monthly",
        amount: 111100, // ₹1,111 in paise
        currency: "INR",
        description: "Monthly subscription — Group Pranayama (Mon/Wed/Fri)",
      },
    },
  },
  {
    slug: "bundle-annual",
    razorpay: {
      period: "yearly" as const,
      interval: 1,
      item: {
        name: "Face Yoga + Pranayama Annual",
        amount: 600000, // ₹6,000 in paise
        currency: "INR",
        description:
          "Annual subscription — Face Yoga + Pranayama Bundle (Mon/Wed/Fri)",
      },
    },
  },
  {
    slug: "bundle-monthly",
    razorpay: {
      period: "monthly" as const,
      interval: 1,
      item: {
        name: "Face Yoga + Pranayama Monthly",
        amount: 150000, // ₹1,500 in paise
        currency: "INR",
        description:
          "Monthly subscription — Face Yoga + Pranayama Bundle (Mon/Wed/Fri)",
      },
    },
  },
];

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("🏦 Creating Razorpay plans...\n");
  console.log(
    `   Environment: ${RAZORPAY_KEY_ID?.startsWith("rzp_live") ? "PRODUCTION" : "TEST"}\n`
  );

  let created = 0;
  let skipped = 0;

  for (const def of PLAN_DEFINITIONS) {
    // Check if plan already has a Razorpay plan ID in DB
    const existing = await prisma.plan.findUnique({
      where: { slug: def.slug },
      select: { id: true, razorpayPlanId: true, name: true },
    });

    if (!existing) {
      console.log(`⚠️  Plan "${def.slug}" not found in DB — run seed first`);
      continue;
    }

    if (existing.razorpayPlanId && !existing.razorpayPlanId.includes("TEST")) {
      console.log(
        `⏭️  ${def.slug} — already has Razorpay plan: ${existing.razorpayPlanId}`
      );
      skipped++;
      continue;
    }

    // Create plan on Razorpay
    try {
      const plan = await razorpay.plans.create(def.razorpay);

      // Store the Razorpay plan ID back into our DB
      await prisma.plan.update({
        where: { slug: def.slug },
        data: { razorpayPlanId: plan.id },
      });

      console.log(
        `✅ ${def.slug} → ${plan.id} (${def.razorpay.period}, ₹${def.razorpay.item.amount / 100})`
      );
      created++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${def.slug} — failed: ${message}`);
    }
  }

  console.log(
    `\n🎉 Done! Created: ${created}, Skipped: ${skipped}, Total: ${PLAN_DEFINITIONS.length}`
  );
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
