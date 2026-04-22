import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@ru/ui";
import { createGhostClient, type GhostPost } from "@ru/ghost-client";
import { NewsletterForm } from "@/components/newsletter-form";

export const metadata: Metadata = {
  title: "Blog | Notes on Face Yoga & Breathwork",
  description:
    "Our notes on face yoga techniques, pranayama practice, and building a routine that lasts. New posts every Thursday.",
};

export const revalidate = 60; // Revalidate every minute

export default async function BlogPage() {
  const ghost = createGhostClient();
  
  let posts: GhostPost[] = [];
  try {
    const response = await ghost.getPosts({
      limit: 12,
      include: ["authors", "tags"],
      order: "published_at desc",
    });
    posts = response.posts;
  } catch (error) {
    console.error("Failed to fetch posts:", error);
  }

  return (
    <main className="min-h-screen px-4 pt-24 pb-8">
      <div className="mx-auto max-w-4xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground">Blog</span>
        </nav>

        <h1 className="text-4xl font-light tracking-tight mb-4">Blog</h1>
        <p className="text-muted-foreground mb-12 max-w-full">
          Our notes on face yoga, breathwork, and building a practice that lasts.
        </p>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`}>
                <Card glass className="overflow-hidden group h-full hover:border-primary/50 transition-colors">
                  {post.feature_image && (
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={post.feature_image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    {post.primary_tag && (
                      <span className="text-xs text-primary font-medium">
                        {post.primary_tag.name}
                      </span>
                    )}
                    <h2 className="text-lg font-medium mt-2 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.published_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {post.reading_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.reading_time} min read
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 p-8 void-card text-center">
          <h2 className="text-2xl font-semibold mb-2">Our weekly notes</h2>
          <p className="text-muted-foreground mb-6">
            Short, useful notes on face yoga and breathwork. Every Thursday.
          </p>
          <NewsletterForm />
        </div>
      </div>
    </main>
  );
}
