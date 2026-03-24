'use client';

import { Bell, Search, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/scores': 'Cura Scores',
  '/chat': 'AI Chat',
  '/explorer': 'Schema Explorer',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

export default function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || 'CuraDB AI';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="lg:hidden w-8" /> {/* Spacer for mobile menu button */}
        <div>
          <h1 className="text-xl font-bold text-cura-navy">{title}</h1>
          <p className="text-xs text-gray-500">Cura Healthcare Intelligence Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-48">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-600 outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-cura-navy hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cura-coral rounded-full" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 p-1.5 pr-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          <div className="w-7 h-7 bg-cura-blue rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="hidden md:block text-sm font-medium text-gray-700">Admin</span>
        </button>
      </div>
    </header>
  );
}
