import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Car, Settings } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vehicles', label: 'Veicoli', icon: Car },
  { href: '/settings', label: 'Impostazioni', icon: Settings },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // treat as unauthenticated
  }

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            carDoc
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t px-3 py-4 space-y-2">
          <p className="truncate max-w-[160px] px-3 text-xs text-muted-foreground" title={user.email}>
            {user.email}
          </p>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex h-14 w-full items-center border-b bg-card px-4 fixed top-0 z-10">
        <span className="text-lg font-bold">carDoc</span>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:p-8 p-4 mt-14 md:mt-0">
        {children}
      </main>
    </div>
  )
}
