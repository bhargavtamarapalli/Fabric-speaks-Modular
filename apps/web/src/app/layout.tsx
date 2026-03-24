import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegistry } from "@/components/organisms/PwaRegistry";
import { ToastProvider } from "@/context/ToastContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Fabric Speaks",
  description: "Fabric-first apparel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fabric Speaks",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D7377",
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmSerifDisplay.variable} ${dmMono.variable} antialiased font-sans`}
      >
        <ToastProvider>
          <AuthProvider>
            <ErrorBoundary>
              <PwaRegistry />
              {children}
            </ErrorBoundary>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
