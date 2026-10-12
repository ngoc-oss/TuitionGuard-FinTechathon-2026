import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TuitionGuard — Tuition payment workspace",
  description: "Compare, approve and reconcile cross-border tuition payments in a protected sandbox.",
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
