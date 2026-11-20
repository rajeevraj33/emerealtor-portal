import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import CompareTray from "@/components/CompareTray";
import ChatAssistant from "@/components/ChatAssistant";
import Analytics from "@/components/Analytics";
import { getActiveTenant, brandStyle } from "@/lib/tenant";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getActiveTenant();
  return {
    title: { default: `${t.name} — GTA Real Estate`, template: `%s | ${t.name}` },
    description: "Search homes for sale and rent across the Greater Toronto Area. Listing detail, sold history, neighbourhood data and instant home estimates.",
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tenant = await getActiveTenant();
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-800" style={brandStyle(tenant)}>
        <Analytics />
        <a href="#main" className="skip-link">Skip to content</a>
        <ImpersonationBanner />
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <CompareTray />
        <ChatAssistant />
        <Footer />
      </body>
    </html>
  );
}
