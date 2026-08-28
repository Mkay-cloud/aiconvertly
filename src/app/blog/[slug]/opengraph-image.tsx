import { getBlogPost } from "@/lib/blog";
import { renderBlogFeaturedImage, BLOG_IMAGE_SIZE } from "@/lib/blogImage";

// A static `alt` export (the simpler config option -- see opengraph-image's
// own docs) can't vary per slug, and every other article would then share
// this one's alt text on its og:image:alt tag, which is worse than a
// generic-but-honest alt would be. generateImageMetadata is the file
// convention's documented way to give each dynamic-route image its own
// per-post alt text (here, the post's own real title -- exactly what's
// rendered into the image itself, not invented copy).
export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  return [
    {
      id: "featured",
      alt: post ? `${post.title} — AI convertly` : "AI convertly",
      size: BLOG_IMAGE_SIZE,
      contentType: "image/png",
    },
  ];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  return renderBlogFeaturedImage(post?.title ?? "AI convertly", post?.category ?? "");
}
