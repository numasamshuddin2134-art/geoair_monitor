import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoAir Monitor // Global Environmental Intelligence System",
  description:
    "Tactical environmental intelligence platform providing real-time air quality, weather, fire detection, and AI predictive analysis.",
  keywords: ["air quality", "environment", "intelligence", "geospatial", "AQI", "FIRMS", "weather"],
  authors: [{ name: "GeoAir Intelligence C2" }],
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-[#05070a]">
      <body className="bg-[#05070a] text-[#d9e2ec] antialiased overflow-hidden h-screen w-screen selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
