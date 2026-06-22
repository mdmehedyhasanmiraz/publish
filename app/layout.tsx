import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationPrompt } from "@/components/public/notification-prompt";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Sciencelet",
    template: "%s | Sciencelet",
  },
  description:
    "Sciencelet is an independent STM publisher of open access journals in AI, life sciences, and related technical fields.",
};

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.className} min-w-0 antialiased`}>
        {children}
        <NotificationPrompt />
      </body>
    </html>
  );
}
