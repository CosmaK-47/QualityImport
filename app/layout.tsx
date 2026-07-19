import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "QI Quality Imports — Authentic fashion for Moldova",
    description: "Authentic fashion, carefully selected and quality-verified for customers and resellers across Moldova.",
    openGraph: {
      title: "QI Quality Imports",
      description: "Authentic fashion, carefully selected.",
      type: "website",
      locale: "ro_MD",
      siteName: "QI Quality Imports",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1659,
          height: 948,
          alt: "QI Quality Imports — Authentic fashion, carefully selected.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "QI Quality Imports",
      description: "Authentic fashion, carefully selected.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
