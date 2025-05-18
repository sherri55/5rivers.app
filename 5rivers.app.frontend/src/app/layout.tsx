"use client";

import React from "react";
import "./globals.css";
import Header from "../components/common/Header";
import Footer from "../components/common/Footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only render children (public pages) without sidebar/footer
  return (
    <html lang="en">
      <body className="bg-background min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
