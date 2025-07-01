"use client";

import "../globals.css";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  Briefcase,
  Users,
  Building2,
  FileText,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/src/components/common/AuthGuard";

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/gated" },
  {
    icon: <Building2 size={20} />,
    label: "Companies",
    href: "/gated/companies",
  },
  {
    icon: <Users size={20} />,
    label: "Dispatchers",
    href: "/gated/dispatchers",
  },
  { icon: <Users size={20} />, label: "Drivers", href: "/gated/drivers" },
  { icon: <Truck size={20} />, label: "Units", href: "/gated/units" },
  {
    icon: <Briefcase size={20} />,
    label: "Job Types",
    href: "/gated/jobtypes",
  },
  { icon: <Briefcase size={20} />, label: "Jobs", href: "/gated/jobs" },
  { icon: <FileText size={20} />, label: "Invoices", href: "/gated/invoices" },
];

function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  pathname,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  pathname: string;
}) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-40">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-slate-200 shadow-xl">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center justify-center flex-shrink-0 px-6 mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">5Rivers</h1>
                  <p className="text-xs text-slate-600 -mt-1">Admin Portal</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-4 flex-1 px-4 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div
                      className={`mr-3 transition-colors ${
                        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    >
                      {item.icon}
                    </div>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-slate-200">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-slate-50">
                <div className="p-2 bg-slate-200 rounded-lg">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">Admin User</p>
                  <p className="text-xs text-slate-600 truncate">admin@5rivers.ca</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div className="fixed inset-0 flex z-40">
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center justify-center px-4 mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">5Rivers</h1>
                    <p className="text-xs text-slate-600 -mt-1">Admin Portal</p>
                  </div>
                </div>
              </div>
              <nav className="mt-5 px-4 space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div
                        className={`mr-4 transition-colors ${
                          isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700"
                        }`}
                      >
                        {item.icon}
                      </div>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
          <div className="flex-shrink-0 w-14"></div>
        </div>
      </div>
    </>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between text-sm text-slate-600">
        <span>
          &copy; {new Date().getFullYear()} 5 Rivers Trucking Inc. All rights reserved.
        </span>
        <div className="flex items-center space-x-4">
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for token in localStorage (or cookies if you prefer)
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login"); // Redirect to login if not authenticated
    }
  }, [router]);

  return (
    <AuthGuard>
      <html lang="en" className="h-full">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#1e293b" />
        </head>
        <body className="bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen flex flex-col">
          {/* Sidebar and mobile menu */}
          <Sidebar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            pathname={pathname}
          />
          
          {/* Top header for mobile */}
          <div className="sticky top-0 z-30 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white/95 backdrop-blur-md border-b border-slate-200">
            <button
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          {/* Main content */}
          <div className="md:pl-72 flex flex-col flex-1">
            <main className="flex-1">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-fade-in">
                  {children}
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </body>
      </html>
    </AuthGuard>
  );
}
