import type { Metadata } from "next";
import { DM_Sans, Crimson_Text } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson-text",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "TravelAgent Hub | AI-Powered Multi-Group Itinerary Management",
  description: "AI-powered platform for travel agents managing multiple groups, families, and itineraries with zero stress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body
        className={`${dmSans.variable} ${crimsonText.variable} bg-neutral-50 text-neutral-900 font-sans antialiased selection:bg-teal-100`}
      >
        {children}
      </body>
    </html>
  );
}
