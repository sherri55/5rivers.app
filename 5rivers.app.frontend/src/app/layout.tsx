import "./globals.css";
import React from "react";
import Link from "next/link";
import { Button } from "../components/ui/button";

function Header() {
  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          5 Rivers
        </Link>
        <nav className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/features/units">Units</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/features/jobs">Jobs</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/features/companies">Companies</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/features/drivers">Drivers</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/features/dispatchers">Dispatchers</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/features/invoices">Invoices</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-muted border-t mt-10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          &copy; {new Date().getFullYear()} 5 Rivers. All rights reserved.
        </span>
        <span>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </span>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
