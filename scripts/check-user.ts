import { prisma } from "@ru/db";

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: "agballygunge@gmail.com" },
    include: {
      memberships: {
        include: { plan: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    console.log("User not found");
    await prisma.$disconnect();
    return;
  }

  console.log("User:", user.name, "|", user.email);
  console.log("\nMemberships:");
  user.memberships.forEach((m) => {
    console.log("  -", m.plan.product.type, "/", m.plan.name, "/", m.status);
  });

  await prisma.$disconnect();
}

check().catch(console.error);
