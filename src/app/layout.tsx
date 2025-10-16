import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZenCourt - SaaS Dashboard",
  description: "Modern SaaS dashboard for video editing and social media management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
