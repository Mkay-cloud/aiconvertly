import Link from "next/link";
import type { BlogPostMeta } from "@/lib/blog";
import { formatPublishDate, featuredImageUrl } from "@/lib/blog";

export function BlogPostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card transition-all hover:-translate-y-1 hover:border-accent/40"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- generated
          at request time by a Next route handler (not a static asset),
          so next/image's build-time optimization pipeline doesn't apply. */}
      <img
        src={featuredImageUrl(post.slug)}
        alt=""
        width={1200}
        height={630}
        className="aspect-[1200/630] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-3 p-6">
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
      </div>
    </Link>
  );
}
