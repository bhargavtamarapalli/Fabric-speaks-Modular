import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegistry } from "@/components/organisms/PwaRegistry";
import { ToastProvider } from "@/context/ToastContext";

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Fabric Speaks",
  description: "Fabric-first apparel",
  manifest: "/manifest.json",
  themeColor: "#0D7377",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fabric Speaks",
  },
};

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
          <PwaRegistry />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
