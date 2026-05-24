import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team 04",
  description: "Engineer Guild Hackathon 2026/05 Team 04 の Next.js アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
