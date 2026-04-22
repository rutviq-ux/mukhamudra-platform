"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { affiliateProductSchema, type AffiliateProductInput } from "@ru/config";

type AffiliateFormValues = z.input<typeof affiliateProductSchema>;
import {
  createAffiliateProduct,
  updateAffiliateProduct,
  deleteAffiliateProduct,
} from "./actions";
import { toast } from "@/hooks/use-toast";
import { Button, Input, Label } from "@ru/ui";

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

interface AffiliateManagerProps {
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const DEFAULT_VALUES: AffiliateFormValues = {
  name: "",
  slug: "",
  description: null,
  imageUrl: "",
  affiliateUrl: "",
  displayPrice: "",
  category: "GUA_SHA",
  practiceTypes: ["FACE_YOGA"],
  isFeatured: false,
  isActive: true,
  sortOrder: 0,
};

export function AffiliateManager({ products }: AffiliateManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null); // "new" or product id
  const [deleting, setDeleting] = useState<string | null>(null);

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(affiliateProductSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function startCreate() {
    form.reset(DEFAULT_VALUES);
    setEditing("new");
  }

  function startEdit(product: Product) {
    form.reset({
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrl: product.imageUrl,
      affiliateUrl: product.affiliateUrl,
      displayPrice: product.displayPrice,
      category: product.category,
      practiceTypes: product.practiceTypes,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
    });
    setEditing(product.id);
  }

  function cancel() {
    setEditing(null);
  }

  function onSubmit(data: AffiliateFormValues) {
    startTransition(async () => {
      const result =
        editing === "new"
          ? await createAffiliateProduct(data)
          : await updateAffiliateProduct({ id: editing!, ...data });

      if (result.success) {
        toast({ title: editing === "new" ? "Product created" : "Product updated" });
        router.refresh();
        setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
        if (result.fieldErrors) {
          for (const [field, msgs] of Object.entries(result.fieldErrors)) {
            form.setError(field as keyof AffiliateProductInput, { message: msgs[0] });
          }
        }
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeleting(id);
    startTransition(async () => {
      const result = await deleteAffiliateProduct({ id });
      if (result.success) {
        toast({ title: "Product deleted" });
        router.refresh();
        if (editing === id) setEditing(null);
      } else {
        toast({ title: result.error, variant: "destructive" });
      }
      setDeleting(null);
    });
  }

  function togglePracticeType(type: PracticeType) {
    const current = form.getValues("practiceTypes");
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    form.setValue("practiceTypes", updated);
  }

  const watchedImageUrl = form.watch("imageUrl");
  const watchedPracticeTypes = form.watch("practiceTypes");
  const watchedCategory = form.watch("category");

  if (editing) {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: Name + Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              {...form.register("name", {
                onChange: (e) => {
                  if (editing === "new") {
                    form.setValue("slug", slugify(e.target.value));
                  }
                },
              })}
              placeholder="e.g. Rose Quartz Gua Sha"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-slug">Slug</Label>
            <Input
              id="product-slug"
              {...form.register("slug")}
              placeholder="e.g. rose-quartz-gua-sha"
            />
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
            )}
          </div>
        </div>

        {/* Row 2: Image URL + preview */}
        <div className="space-y-2">
          <Label htmlFor="product-image">Image URL</Label>
          <Input
            id="product-image"
            {...form.register("imageUrl")}
            placeholder="https://..."
          />
          {form.formState.errors.imageUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.imageUrl.message}</p>
          )}
          {watchedImageUrl && (
            <img
              src={watchedImageUrl}
              alt="Preview"
              className="h-16 w-16 rounded-lg object-cover border border-border"
            />
          )}
        </div>

        {/* Row 3: Affiliate URL */}
        <div className="space-y-2">
          <Label htmlFor="product-url">Affiliate URL</Label>
          <Input
            id="product-url"
            {...form.register("affiliateUrl")}
            placeholder="https://amzn.to/..."
          />
          {form.formState.errors.affiliateUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.affiliateUrl.message}</p>
          )}
        </div>

        {/* Row 4: Price, Category, Sort Order */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product-price">Display Price</Label>
            <Input
              id="product-price"
              {...form.register("displayPrice")}
              placeholder="₹1,299"
            />
            {form.formState.errors.displayPrice && (
              <p className="text-sm text-destructive">{form.formState.errors.displayPrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-category">Category</Label>
            <select
              id="product-category"
              value={watchedCategory}
              onChange={(e) => form.setValue("category", e.target.value as Category)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {form.formState.errors.category && (
              <p className="text-sm text-destructive">{form.formState.errors.category.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-sort">Sort Order</Label>
            <Input
              id="product-sort"
              type="number"
              {...form.register("sortOrder", { valueAsNumber: true })}
              min={0}
            />
            {form.formState.errors.sortOrder && (
              <p className="text-sm text-destructive">{form.formState.errors.sortOrder.message}</p>
            )}
          </div>
        </div>

        {/* Row 5: Description */}
        <div className="space-y-2">
          <Label htmlFor="product-desc">Description</Label>
          <textarea
            id="product-desc"
            {...form.register("description")}
            placeholder="Optional product description..."
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
            maxLength={2000}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
          )}
        </div>

        {/* Row 6: Practice Types */}
        <div className="space-y-2">
          <Label>Practice Types</Label>
          <div className="flex gap-4">
            {(Object.entries(PRACTICE_TYPE_LABELS) as [PracticeType, string][]).map(
              ([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={watchedPracticeTypes.includes(value)}
                    onChange={() => togglePracticeType(value)}
                    className="rounded"
                  />
                  {label}
                </label>
              )
            )}
          </div>
          {form.formState.errors.practiceTypes && (
            <p className="text-sm text-destructive">{form.formState.errors.practiceTypes.message}</p>
          )}
        </div>

        {/* Row 7: Active + Featured */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register("isActive")}
              className="rounded"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register("isFeatured")}
              className="rounded"
            />
            Featured
          </label>
        </div>

        {/* Row 8: Actions */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : editing === "new" ? "Create Product" : "Update Product"}
          </Button>
          <Button type="button" variant="outline" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={startCreate}>
          + New product
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3">Image</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Practice</th>
              <th className="text-left p-3">Clicks</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="p-3">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                </td>
                <td className="p-3 font-medium">{product.name}</td>
                <td className="p-3">{CATEGORY_LABELS[product.category]}</td>
                <td className="p-3">{product.displayPrice}</td>
                <td className="p-3">
                  <div className="flex gap-1 flex-wrap">
                    {product.practiceTypes.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                      >
                        {PRACTICE_TYPE_LABELS[t]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">{product.clickCount}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      product.isActive
                        ? "bg-success/20 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                  {product.isFeatured && (
                    <span className="ml-1 px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-600">
                      Featured
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(product)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(product.id)}
                      disabled={deleting === product.id}
                    >
                      {deleting === product.id ? "..." : "Delete"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  No affiliate products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
