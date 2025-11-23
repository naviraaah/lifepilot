import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ["latin"],
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: "LifePilot - Your AI Life Admin Assistant",
  description: "Autonomous AI assistant that handles everyday tasks like scheduling appointments, canceling subscriptions, and disputing charges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={workSans.variable}>
        {children}
      </body>
    </html>
  );
}
