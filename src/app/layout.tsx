import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";

// Single family for both headlines and body text -- hierarchy comes from
// weight (400 body, 600/700 headlines via existing font-semibold/font-bold
// classes throughout the site), not a second family. next/font/google
// self-hosts this at build time (downloaded once, served from this site's
// own origin), same as the Geist/Inter pair it replaces -- no live request
// to Google at runtime.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | AI convertly",
  },
  description: SITE_DESCRIPTION,
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
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    other: {
      "msvalidate.01": "9A47BA8E17E031EA1A34120A22991BE58",
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
      // The theme-init script below sets data-theme on this element via
      // direct DOM manipulation before React hydrates -- an attribute
      // React's own server render never included, so hydration would
      // otherwise (correctly, but harmlessly) warn about a mismatch it
      // didn't cause and can't control. Standard, necessary pairing with
      // that no-flash technique (used by next-themes and equivalents).
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-bg font-sans text-foreground">
        {/* Runs synchronously before first paint, so the correct theme's
            colors apply immediately -- no flash of the wrong theme while
            waiting for React to hydrate. See src/lib/theme.ts for the
            exact logic (kept in one shared string so this can't drift
            from ThemeToggle's own reads/writes of the same storage key). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
        <Header />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
