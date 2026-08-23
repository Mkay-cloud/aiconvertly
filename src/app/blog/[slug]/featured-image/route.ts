import { getBlogPost } from "@/lib/blog";
import { renderBlogFeaturedImage } from "@/lib/blogImage";

// A stable, un-hashed URL for the SAME generated image opengraph-image.tsx
// produces -- Next's metadata-file-convention route (used for the og:image/
// twitter:image meta tags) gets a content-hashed query string appended
// automatically, which makes it unsuitable to hardcode directly in an
// <img src> from our own components. This route calls the identical
// generator (blogImage.tsx) so both the visible featured image and the
// social-share image are pixel-for-pixel the same output, just served at
// two URLs for two different purposes.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return new Response("Not found", { status: 404 });
  return renderBlogFeaturedImage(post.title, post.category);
}
