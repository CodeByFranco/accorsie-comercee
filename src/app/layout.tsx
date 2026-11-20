import type { Metadata } from "next";
import { Geist_Mono, Inter, Libertinus_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/** Títulos editoriais (página Quem somos). */
const libertinus = Libertinus_Serif({
  variable: "--font-libertinus",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Accorsi Auto Peças",
  description: "Peças e acessórios automotivos. Loja em preparação.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} ${libertinus.variable} h-full overflow-x-hidden bg-white antialiased`}
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden bg-white font-sans">
        {children}
      </body>
    </html>
  );
}
