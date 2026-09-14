import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://qi-quality-imports.cosmak-47.chatgpt.site";

  return {
    metadataBase: new URL(origin),
    title: "QI Quality Imports — Selected fashion for Moldova",
    description: "Fashion, carefully selected for customers and resellers across Moldova, with verification status shown clearly.",
    openGraph: {
      title: "QI Quality Imports",
      description: "Fashion, carefully selected.",
      type: "website",
      locale: "ro_MD",
      siteName: "QI Quality Imports",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1672,
          height: 941,
          alt: "QI Quality Imports — Fashion, carefully selected.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "QI Quality Imports",
      description: "Fashion, carefully selected.",
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
