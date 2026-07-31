import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/manrope";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const title = "Plateful — turn playlists into progress";
  const description =
    "A private, adaptive study planner for YouTube playlists, notes, progress, and Calendar reconciliation.";
  const image = new URL("/og.png", base).toString();

  return {
    metadataBase: base,
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1792, height: 917 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
