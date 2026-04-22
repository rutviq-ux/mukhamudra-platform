import { prisma } from "@ru/db";
import { ToolsContent } from "./tools-content";

export default async function ToolsPage() {
  const products = await prisma.affiliateProduct.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <ToolsContent
      products={products.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  );
}
