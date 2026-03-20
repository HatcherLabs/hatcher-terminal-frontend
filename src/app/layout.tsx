import type { Metadata, Viewport } from "next";
import { Lexend, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { KeyProvider } from "@/components/providers/KeyProvider";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "HATCHER TERMINAL",
  description: "Swipe right to ape. Tinder for Pump.fun tokens.",
  other: {
    "color-scheme": "dark",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06060b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${lexend.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <KeyProvider>{children}</KeyProvider>
      </body>
    </html>
  );
}
