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
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className="bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen flex flex-col antialiased">
        <div className="relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            <Header />
            <main className="flex-1 flex flex-col">
              <div className="animate-fade-in">
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
