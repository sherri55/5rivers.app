import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ChatWidget } from '../agent/ChatWidget';

// ============================================
// AppLayout — the authenticated app shell.
// Wraps all protected pages with sidebar + header.
// ============================================

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area — offset for sidebar on desktop */}
      <main className="lg:ml-64 pt-20 pb-24 lg:pb-12 px-4 md:px-8 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* AI Assistant chat widget */}
      <ChatWidget />
    </div>
  );
}
