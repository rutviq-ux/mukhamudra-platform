"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ru/ui";
import { ExternalLink, Star } from "lucide-react";

type Category = "GUA_SHA" | "ROLLER" | "OIL" | "CREAM" | "BOOK" | "MAT" | "PROP" | "OTHER";
type PracticeType = "FACE_YOGA" | "PRANAYAMA" | "BUNDLE";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  affiliateUrl: string;
  displayPrice: string;
  category: Category;
  practiceTypes: PracticeType[];
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ToolsContentProps {
  products: Product[];
}

const CATEGORY_LABELS: Record<Category, string> = {
  GUA_SHA: "Gua Sha",
  ROLLER: "Roller",
  OIL: "Oil",
  CREAM: "Cream",
  BOOK: "Book",
  MAT: "Mat",
  PROP: "Prop",
  OTHER: "Other",
};

const PRACTICE_TYPE_LABELS: Record<PracticeType, string> = {
  FACE_YOGA: "Face Yoga",
  PRANAYAMA: "Pranayama",
  BUNDLE: "Bundle",
};

function trackClick(productId: string) {
  fetch("/api/affiliate/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  }).catch(() => {}); // fire-and-forget
}

function ProductCard({ product }: { product: Product }) {
  function handleClick() {
    trackClick(product.id);
    window.open(product.affiliateUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="group cursor-pointer rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-border hover:shadow-lg"
      onClick={handleClick}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {product.isFeatured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </div>
        )}
        <div className="absolute top-3 right-3 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
          {product.displayPrice}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {CATEGORY_LABELS[product.category]}
        </span>

        <h3 className="font-medium text-foreground line-clamp-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex gap-1.5 flex-wrap pt-1">
          {product.practiceTypes.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full text-xs bg-muted/60 text-muted-foreground"
            >
              {PRACTICE_TYPE_LABELS[t]}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pt-2 text-sm font-medium text-primary">
          <ExternalLink className="h-3.5 w-3.5" />
          View on Amazon
        </div>
      </div>
    </div>
  );
}

export function ToolsContent({ products }: ToolsContentProps) {
  const [activeCategory, setActiveCategory] = useState<Category | "ALL">("ALL");

  const categories = Array.from(
    new Set(products.map((p) => p.category))
  ).sort();

  function filterProducts(practiceFilter: PracticeType | "ALL") {
    let filtered = products;

    if (practiceFilter !== "ALL") {
      filtered = filtered.filter((p) =>
        p.practiceTypes.includes(practiceFilter)
      );
    }

    if (activeCategory !== "ALL") {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }

    return filtered;
  }

  function renderGrid(items: Product[]) {
    if (items.length === 0) {
      return (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg">No products found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  }

  function renderCategoryFilters() {
    if (categories.length <= 1) return null;

    return (
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            activeCategory === "ALL"
              ? "bg-foreground text-background"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              activeCategory === cat
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl md:text-3xl font-light tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tools & Essentials
        </h1>
        <p className="text-muted-foreground mt-2">
          Curated tools to enhance your practice
        </p>
      </div>

      {/* Tabs by practice type */}
      <Tabs defaultValue="ALL" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="FACE_YOGA">Face Yoga</TabsTrigger>
          <TabsTrigger value="PRANAYAMA">Pranayama</TabsTrigger>
        </TabsList>

        {(["ALL", "FACE_YOGA", "PRANAYAMA"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            {renderCategoryFilters()}
            {renderGrid(filterProducts(tab))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Amazon Associates disclosure */}
      <div className="mt-12 pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          As an Amazon Associate, we earn from qualifying purchases. Product
          prices and availability are subject to change.
        </p>
      </div>
    </div>
  );
}
