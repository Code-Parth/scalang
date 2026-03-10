import "./globals.css";
import type { Metadata } from "next";
import "@scalang/react/style.css";

export const metadata: Metadata = {
  title: "Scalang API Docs",
  description:
    "Multilingual OpenAPI documentation powered by Scalar and Lingo.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
