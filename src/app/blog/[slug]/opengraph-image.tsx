import { getBlogPost } from "@/lib/blog";
import { renderBlogFeaturedImage, BLOG_IMAGE_SIZE } from "@/lib/blogImage";

export const size = BLOG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  return renderBlogFeaturedImage(post?.title ?? "AI convertly", post?.category ?? "");
}
