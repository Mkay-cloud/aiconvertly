import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { BlogPostCard } from "@/components/BlogPostCard";
import { getAllBlogPosts } from "@/lib/blog";

const title = "Blog";
const description =
  "Guides for working with PDFs, images, video, and audio — plus the free, browser-based tools to actually do it.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `${title} | AI convertly`,
    description,
    url: "/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllBlogPosts();

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-20">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-secondary">{description}</p>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-secondary">No articles yet — check back soon.</p>
      )}
    </Container>
  );
}
