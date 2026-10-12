'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api-client';
import { BrandMark } from '@/components/ui';
import { UserContext } from '@/components/user-context';

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const [session, setSession] = useState({ user: null, pendingApprovals: 0 });

  const refresh = useCallback(() => {
    api('/api/auth/me')
      .then((d) => setSession({ user: d.user, pendingApprovals: d.pendingApprovals || 0 }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  const user = session.user;
  const navItems = [
    { href: '/dashboard', label: 'Trainings', match: (p) => p.startsWith('/dashboard') || p.startsWith('/trainings') },
    ...(user?.role === 'MASTER'
      ? [{ href: '/admin', label: session.pendingApprovals ? `Approvals (${session.pendingApprovals})` : 'Approvals', match: (p) => p.startsWith('/admin') }]
      : []),
    { href: '/account', label: 'Account', match: (p) => p.startsWith('/account') },
  ];

  return (
    <UserContext.Provider value={{ ...session, refresh }}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/dashboard" className="brand">
            <BrandMark />
            <span>Attendance</span>
          </Link>
          <nav className="nav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={item.match(pathname) ? 'active' : ''}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="user-chip">
            {user && (
              <span className="muted small" title={user.username}>
                {user.displayName || user.username}
                {user.role === 'MASTER' ? ' · Master' : ''}
              </span>
            )}
            <button className="btn btn-sm btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
    </UserContext.Provider>
  );
}
