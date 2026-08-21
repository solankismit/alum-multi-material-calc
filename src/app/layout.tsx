import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aluminium Materials Calculator",
  description: "Calculate material requirements for aluminium windows",
};



export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  let user = null;

  if (session?.userId) {
    user = await db.user.findUnique({
      where: { id: session.userId as string },
      select: { name: true, email: true, role: true },
    });
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ToastProvider>
          <Navbar user={user} />
          <main className="flex-grow">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
