import { prisma } from "@ru/db";

async function run() {
  const plans = await prisma.plan.findMany({ include: { product: true } });
  plans.forEach(p => console.log(
    p.id, '|', p.name, '|', p.interval, '|', p.type, '| razorpayPlanId:', p.razorpayPlanId ?? 'NULL'
  ));
  await prisma.$disconnect();
}

run().catch(console.error);
