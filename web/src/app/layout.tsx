import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tx Congestionamento | Painel",
  description: "Painel executivo de taxa de congestionamento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}