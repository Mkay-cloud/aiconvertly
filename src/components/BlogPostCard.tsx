import Link from "next/link";
import type { BlogPostMeta } from "@/lib/blog";
import { formatPublishDate } from "@/lib/blog";

export function BlogPostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-accent/40"
    >
      <div className="flex items-center gap-3 text-xs font-medium text-secondary">
        <span className="rounded-full border border-card-border px-2.5 py-1 text-accent">
          {post.category}
        </span>
        <time dateTime={post.publishDate}>{formatPublishDate(post.publishDate)}</time>
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground">{post.title}</h2>
      <p className="text-sm leading-relaxed text-secondary">{post.description}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
        Read article
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </span>
    </Link>
  );
}
