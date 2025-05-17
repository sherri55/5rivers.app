"use client";

import React from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only render children (public pages) without sidebar/footer
  return (
    <html lang="en">
      <body className="bg-background min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
