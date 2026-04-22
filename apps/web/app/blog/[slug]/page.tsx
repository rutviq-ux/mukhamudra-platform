import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Clock, User } from "lucide-react";
import { Button } from "@ru/ui";
import { createGhostClient } from "@ru/ghost-client";
import { NewsletterForm } from "@/components/newsletter-form";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ghost = createGhostClient();
  const post = await ghost.getPostBySlug(slug);

  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | Mukha Mudra`,
    description: post.meta_description || post.excerpt,
    openGraph: {
      title: post.og_title || post.title,
      description: post.og_description || post.excerpt,
      images: post.og_image || post.feature_image ? [post.og_image || post.feature_image!] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const ghost = createGhostClient();
  const post = await ghost.getPostBySlug(slug);

  if (!post) notFound();

  return (
    <main className="min-h-screen px-4 pt-24 pb-8">
      <article className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">
            {post.title}
          </span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          {post.primary_tag && (
            <span className="text-sm text-primary font-medium">
              {post.primary_tag.name}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-light tracking-tight mt-2 mb-4">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {post.primary_author && (
              <span className="flex items-center gap-2">
                {post.primary_author.profile_image && (
                  <Image
                    src={post.primary_author.profile_image}
                    alt={post.primary_author.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
                <User className="h-4 w-4" />
                {post.primary_author.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.published_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            {post.reading_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.reading_time} min read
              </span>
            )}
          </div>
        </header>

        {/* Feature Image */}
        {post.feature_image && (
          <div className="aspect-video relative rounded-[8px] overflow-hidden mb-8">
            <Image
              src={post.feature_image}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:font-light prose-headings:tracking-tight
            prose-a:text-primary hover:prose-a:text-primary-hover
            prose-pre:bg-muted prose-pre:rounded-xl
            prose-code:text-accent prose-code:before:content-none prose-code:after:content-none
            prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.html || "" }}
        />

        {/* CTAs */}
        <div className="mt-12 p-8 void-card">
          <h3 className="text-xl font-semibold mb-4 text-center">
            Ready to practice with us?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/face-yoga">
              <Button variant="accent" size="lg">
                Start Face Yoga
              </Button>
            </Link>
            <Link href="/pranayama">
              <Button variant="default" size="lg">
                Join Pranayama
              </Button>
            </Link>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-8 p-8 void-card text-center">
          <h3 className="text-lg font-semibold mb-2">
            Our weekly notes
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Face yoga and breathwork insights, every Thursday.
          </p>
          <NewsletterForm />
        </div>
      </article>
    </main>
  );
}
