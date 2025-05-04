"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Truck,
  Briefcase,
  Users,
  Building2,
  FileText,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function MainLayout({ children, title, breadcrumbs = [] }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: "Dashboard", href: "/" },
    { icon: <Building2 size={18} />, label: "Companies", href: "/companies" },
    { icon: <Users size={18} />, label: "Dispatchers", href: "/dispatchers" },
    { icon: <Users size={18} />, label: "Drivers", href: "/drivers" },
    { icon: <Truck size={18} />, label: "Units", href: "/units" },
    { icon: <Briefcase size={18} />, label: "Job Types", href: "/jobtypes" },
    { icon: <Briefcase size={18} />, label: "Jobs", href: "/jobs" },
    { icon: <FileText size={18} />, label: "Invoices", href: "/invoices" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-center flex-shrink-0 px-4">
              <h1 className="text-2xl font-bold text-blue-600">5Rivers</h1>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div
                      className={`mr-3 ${
                        isActive ? "text-blue-700" : "text-gray-500"
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
      </div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
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
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-2xl font-bold text-blue-600">5Rivers</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div
                        className={`mr-4 ${
                          isActive ? "text-blue-700" : "text-gray-500"
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

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Page header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {breadcrumbs.length > 0 && (
              <div className="flex items-center text-sm text-gray-500 mb-1">
                {breadcrumbs.map((crumb, idx) => (
                  <div key={idx} className="flex items-center">
                    {idx > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-gray-700">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}