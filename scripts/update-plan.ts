import { prisma } from "@ru/db";

async function run() {
  const user = await prisma.user.findUnique({ where: { email: "uyamini1996@gmail.com" } });
  if (!user) throw new Error("User not found");

  const m = await prisma.membership.findFirst({ where: { userId: user.id } });
  if (!m) throw new Error("Membership not found");

  await prisma.membership.update({ where: { id: m.id }, data: { planId: "plan_bundle_annual" } });
  await prisma.order.updateMany({ where: { userId: user.id }, data: { planId: "plan_bundle_annual" } });

  console.log("Updated to Bundle Annual (Face Yoga + Pranayama)");
  await prisma.$disconnect();
}

run().catch(console.error);
