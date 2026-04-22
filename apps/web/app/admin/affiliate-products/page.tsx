import { prisma } from "@ru/db";
import { Card, CardContent, CardHeader, CardTitle } from "@ru/ui";
import { AffiliateManager } from "./affiliate-manager";

export default async function AdminAffiliateProductsPage() {
  const products = await prisma.affiliateProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <h1 className="text-3xl font-light mb-8">Affiliate Products</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-2xl font-semibold">{products.length}</p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold">
              {products.filter((p) => p.isActive).length}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Featured</p>
            <p className="text-2xl font-semibold">
              {products.filter((p) => p.isFeatured).length}
            </p>
          </CardContent>
        </Card>
        <Card glass>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Clicks</p>
            <p className="text-2xl font-semibold">
              {products.reduce((sum, p) => sum + p.clickCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card glass>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <AffiliateManager
            products={products.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
              updatedAt: p.updatedAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
