import type { Metadata } from "next";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../lib/stack/client";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZenCourt - SaaS Dashboard",
  description:
    "Modern SaaS dashboard for video editing and social media management"
};

const customTheme = {
  light: {
    background: "#ffffff",
    foreground: "#000000",
    secondary: "#e8ddd3",
    accent: "#e8ddd3"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          <StackProvider app={stackClientApp}>
            <StackTheme theme={customTheme}>{children}</StackTheme>
          </StackProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
