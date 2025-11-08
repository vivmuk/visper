import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whisper - A Thoughtful Journal",
  description: "A delightfully simple journal that improves your thoughts with AI",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
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

