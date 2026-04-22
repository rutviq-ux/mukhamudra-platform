import { prisma } from "@ru/db";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DemoCheckoutClient } from "./demo-checkout-client";

export default async function AdminDemoCheckoutPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/app");

  const [plans, batches] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      include: { product: { select: { name: true, type: true } } },
      orderBy: [{ product: { type: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.batch.findMany({
      where: { isActive: true },
      include: { product: { select: { name: true, type: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-light mb-2">Demo Checkout</h1>
      <p className="text-muted-foreground mb-8">
        Test Razorpay checkout flows. Uses your configured Razorpay key (test or
        live).
      </p>

      <DemoCheckoutClient
        plans={plans.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          type: p.type,
          interval: p.interval,
          amountPaise: p.amountPaise,
          razorpayPlanId: p.razorpayPlanId,
          productName: p.product.name,
          productType: p.product.type,
        }))}
        batches={batches.map((b) => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
          productType: b.product.type,
          startTime: b.startTime,
          daysOfWeek: b.daysOfWeek,
        }))}
        user={{
          name: user.name || "",
          email: user.email,
        }}
      />
    </div>
  );
}
