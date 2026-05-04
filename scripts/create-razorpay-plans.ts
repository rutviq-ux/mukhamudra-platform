import Razorpay from "razorpay";
import { prisma } from "@ru/db";

const rzp = new Razorpay({
  key_id: "rzp_live_SfD6abSmtNH7in",
  key_secret: "DqYqmEdkKOCDNFaw53EtGuqA",
});

const PLANS = [
  { dbId: "plan_face_monthly",        name: "Face Yoga Monthly",              amount: 111100, period: "monthly", interval: 1 },
  { dbId: "plan_face_annual",         name: "Face Yoga Annual",               amount: 300000, period: "yearly",  interval: 1 },
  { dbId: "plan_pranayama_monthly",   name: "Pranayama Monthly",              amount: 111100, period: "monthly", interval: 1 },
  { dbId: "plan_pranayama_annual",    name: "Pranayama Annual",               amount: 300000, period: "yearly",  interval: 1 },
  { dbId: "plan_bundle_annual",       name: "Bundle Annual (Face + Prana)",   amount: 600000, period: "yearly",  interval: 1 },
  { dbId: "cmmlvxm29000ef7s4znrl01f6", name: "Face Yoga + Pranayama Monthly", amount: 111100, period: "monthly", interval: 1 },
];

async function run() {
  for (const plan of PLANS) {
    try {
      const rzpPlan = await rzp.plans.create({
        period: plan.period as any,
        interval: plan.interval,
        item: {
          name: plan.name,
          amount: plan.amount,
          currency: "INR",
        },
      });

      await prisma.plan.update({
        where: { id: plan.dbId },
        data: { razorpayPlanId: rzpPlan.id },
      });

      console.log(`✅ ${plan.name} → ${rzpPlan.id}`);
    } catch (err: any) {
      console.error(`❌ ${plan.name}:`, err?.error?.description ?? err?.message ?? err);
    }
  }

  await prisma.$disconnect();
  console.log("\nDone!");
}

run().catch(console.error);
