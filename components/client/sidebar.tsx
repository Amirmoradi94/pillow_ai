'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Mic, PhoneCall, Settings, Users, Calendar, ArrowUpRight, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agents', href: '/dashboard/agents', icon: Mic },
  { name: 'Calls', href: '/dashboard/calls', icon: PhoneCall },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function ClientSidebar({ tenantName }: { tenantName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Fetch user profile and subscription data
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []);

  return (
    <aside className="flex h-screen w-64 flex-col glass-strong border-r border-white/10 backdrop-blur-xl">
      {/* Header with premium design */}
      <div className="border-b border-white/10 p-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
            <Mic className="h-5 w-5 text-primary-foreground" />
            <div className="absolute inset-0 rounded-xl bg-white/20 blur-sm" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Pillow AI
          </h1>
        </div>
        {tenantName && (
          <p className="mt-2 text-sm text-muted-foreground truncate">{tenantName}</p>
        )}
      </div>

      {/* Navigation with enhanced styling */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? 'text-white'
                  : 'text-foreground hover:text-primary hover:shadow-card'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg" />
              )}
              {!isActive && (
                <div className="absolute inset-0 glass opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
              )}
              <item.icon className="h-5 w-5 relative z-10" />
              <span className="relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Subscription & Profile Section */}
      <div className="border-t p-4 space-y-3">
        {/* Subscription Plan Box */}
        <div className="rounded-xl bg-card border shadow-sm p-4">
          {/* Plan Badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
              <span className="text-xs font-medium text-foreground">Free Trial</span>
            </div>
          </div>

          {/* Minutes Remaining */}
          <div className="mb-2">
            <div className="text-xs text-muted-foreground mb-1">Remaining:</div>
            <div className="text-2xl font-bold text-foreground">
              {userData?.subscription?.minutes_remaining || 100} min
            </div>
          </div>

          {/* Minutes Usage */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Usage:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">
                  {userData?.subscription?.minutes_used || 0}/{userData?.subscription?.monthly_minutes_limit || 100}
                </span>
                <Info className="h-3 w-3" />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{
                  width: `${((userData?.subscription?.minutes_used || 0) / (userData?.subscription?.monthly_minutes_limit || 100)) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={() => router.push('/dashboard/pricing')}
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-3 py-2 text-sm font-medium text-white transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-1.5"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Upgrade
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 text-xs font-bold text-white">
            {userData?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">
              {userData?.email || 'amir.94.eng@gmail.com'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
