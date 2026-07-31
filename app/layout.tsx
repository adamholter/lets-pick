import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "lets-pick-together.adamholter.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title: "Friday Night — Let's Pick",
    description: "Share a room and vote for every movie you'd watch.",
    icons: {
      icon: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title: "Friday Night — Let's Pick",
      description: "Share a room and vote for every movie you'd watch.",
      images: [{ url: new URL("/og-approved.png", base).toString(), width: 1212, height: 637 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Friday Night — Let's Pick",
      description: "Share a room and vote for every movie you'd watch.",
      images: [new URL("/og-approved.png", base).toString()],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
