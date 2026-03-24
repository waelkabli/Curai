'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Database,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Star,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scores', label: 'Cura Scores', icon: Star },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/explorer', label: 'Schema Explorer', icon: Database },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 p-4 border-b border-blue-800',
        collapsed ? 'justify-center px-2' : 'px-4'
      )}>
        <div className="flex-shrink-0 w-9 h-9 bg-cura-coral rounded-lg flex items-center justify-center shadow-lg">
          <Activity className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-tight">CuraDB</div>
            <div className="text-cura-light-blue text-xs font-medium">AI Intelligence</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                    isActive
                      ? 'bg-cura-blue text-white shadow-lg shadow-blue-900/30'
                      : 'text-blue-200 hover:bg-blue-800/60 hover:text-white',
                    collapsed ? 'justify-center px-2' : ''
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={cn(
                    'flex-shrink-0 transition-transform',
                    isActive ? 'w-5 h-5' : 'w-5 h-5 group-hover:scale-110'
                  )} />
                  {!collapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}
                  {isActive && !collapsed && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cura-coral" />
                  )}
                  {collapsed && (
                    <div className={cn(
                      'absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded',
                      'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
                      'whitespace-nowrap z-50'
                    )}>
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={cn(
        'p-4 border-t border-blue-800',
        collapsed ? 'flex justify-center' : ''
      )}>
        {!collapsed && (
          <div className="text-blue-400 text-xs text-center">
            <div className="font-medium text-blue-300">Cura Healthcare</div>
            <div>Database AI Platform</div>
          </div>
        )}
        {collapsed && (
          <div className="w-2 h-2 rounded-full bg-cura-coral animate-pulse-slow" />
        )}
      </div>

      {/* Collapse button - desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center p-3 text-blue-300 hover:text-white hover:bg-blue-800/60 transition-colors border-t border-blue-800"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-cura-navy rounded-lg text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-cura-navy transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-blue-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col flex-shrink-0 bg-cura-navy transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}
