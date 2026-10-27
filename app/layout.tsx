import type { Metadata, Viewport } from "next";
import { Newsreader, Rethink_Sans } from "next/font/google";

import { SiteHeader } from "@/components/site-header";

import "./globals.css";

const rethinkSans = Rethink_Sans({
  variable: "--font-rethink",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

// Lets the page use the whole screen on a phone, including behind the notch and
// the home indicator. Browsers then report those areas as safe-area insets, and
// the body pads itself by them so nothing interactive sits underneath.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Klaro",
  description:
    "AI-powered commission agreements for independent visual artists in the Philippines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rethinkSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
