import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kicksy",
    template: "%s · Kicksy",
  },
  description: "Organizza le tue partite, bilancia le squadre, scala la classifica.",
  keywords: ["calcetto", "partite", "squadre", "organizzazione", "sport"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kicksy",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Kicksy",
    description: "Organizza le tue partite, bilancia le squadre, scala la classifica.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0C12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${barlowCondensed.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
