'use client';
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-800 font-[family-name:var(--font-geist-sans)]">
      <div className="flex-grow flex items-center justify-center p-8">
        <main className="flex flex-col gap-8 items-center sm:items-start max-w-4xl mx-auto">
          <div className="text-center sm:text-left mb-6">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              5 Rivers Trucking Inc.
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Transportation Management System
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {[
              { title: 'Invoices', href: '/invoices', desc: 'Manage all invoices' },
              { title: 'Jobs', href: '/jobs', desc: 'View and manage jobs' },
              { title: 'Drivers', href: '/drivers', desc: 'Manage driver information' },
              { title: 'Units', href: '/units', desc: 'Track available units' },
              { title: 'Companies', href: '/companies', desc: 'Client company profiles' },
              { title: 'Dispatchers', href: '/dispatchers', desc: 'Dispatcher management' }
            ].map((item) => (
              <Link key={item.title} href={item.href}>
                <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 hover:shadow-md transition-shadow duration-200 h-full">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
      
      <footer className="mt-auto py-6 bg-white dark:bg-gray-900 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} 5 Rivers Trucking Inc.
            </div>
            <div className="flex gap-4">
              <a
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                href="#"
              >
                Terms
              </a>
              <a
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                href="#"
              >
                Privacy
              </a>
              <a
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                href="#"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}