import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof of Trust — CMC Review",
  description: "Evidence, authority, and scope before consequential action.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
