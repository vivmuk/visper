import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whisper - A Thoughtful Journal",
  description: "A delightfully simple journal that improves your thoughts with AI",
  manifest: "/manifest.json",
  themeColor: "#ffffff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

