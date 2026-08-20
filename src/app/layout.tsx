import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE_URL } from "@/lib/site";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI convertly — Free PDF & image tools, right in your browser",
    template: "%s | AI convertly",
  },
  description:
    "Merge, split, rotate, and convert PDFs and images for free. Every tool runs entirely in your browser — no uploads, no sign-up, no limits.",
  keywords: [
    "pdf tools",
    "merge pdf",
    "split pdf",
    "rotate pdf",
    "pdf to jpg",
    "jpg to pdf",
    "free pdf converter",
    "online pdf tools",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "AI convertly",
    title: "AI convertly — Free PDF & image tools, right in your browser",
    description:
      "Merge, split, rotate, and convert PDFs and images for free. Every tool runs entirely in your browser — no uploads, no sign-up, no limits.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI convertly — Free PDF & image tools, right in your browser",
    description:
      "Merge, split, rotate, and convert PDFs and images for free. Every tool runs entirely in your browser — no uploads, no sign-up, no limits.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg font-sans text-foreground">
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
