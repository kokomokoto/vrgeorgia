import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "360 Tour Builder",
  description: "Local 360° virtual tour maker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
