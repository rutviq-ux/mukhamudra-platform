import { prisma } from "@ru/db";

async function seedMember() {
  const email = "uyamini1996@gmail.com";
  const phone = "+918729854516";
  const name = "Yamini Ulaganathan";
  const joinDate = new Date("2026-02-04");
  const endDate = new Date("2027-02-04");
  const amountPaid = 6000;

  console.log(`Seeding: ${name} (${email})`);

  const user = await prisma.user.upsert({
    where: { email },
    update: { phone, name },
    create: {
      email, phone, name,
      role: "USER",
      timezone: "Asia/Kolkata",
      onboardedAt: joinDate,
      termsAcceptedAt: joinDate,
    },
  });
  console.log("✅ User:", user.id);

  const plans = await prisma.plan.findMany();
  console.log("Plans:", plans.map(p => `${p.id}:${p.name}:${p.interval}`));

  const plan = plans.find(p => p.interval === "ANNUAL") ?? plans[0];
  if (!plan) throw new Error("No plans found");
  console.log("Using plan:", plan.name);

  const existing = await prisma.membership.findFirst({ where: { userId: user.id } });
  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", periodStart: joinDate, periodEnd: endDate },
    });
    console.log("✅ Membership updated:", existing.id);
  } else {
    const m = await prisma.membership.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: "ACTIVE",
        periodStart: joinDate,
        periodEnd: endDate,
      },
    });
    console.log("✅ Membership created:", m.id);
  }

  const existingOrder = await prisma.order.findFirst({ where: { userId: user.id } });
  if (!existingOrder) {
    const o = await prisma.order.create({
      data: {
        userId: user.id,
        planId: plan.id,
        razorpayOrderId: `manual_import_${user.id}`,
        amountPaise: amountPaid * 100,
        currency: "INR",
        status: "PAID",
        paidAt: joinDate,
        metadata: { source: "manual_import" },
      },
    });
    console.log("✅ Order created:", o.id);
  } else {
    console.log("ℹ️ Order exists:", existingOrder.id);
  }

  console.log("\n🎉 Done!");
}

seedMember().catch(console.error).finally(() => prisma.$disconnect());
