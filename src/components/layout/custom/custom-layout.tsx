'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { NavList } from './nav-list'
import { TopBar } from './top-bar'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

const STORAGE_KEY = 'kamal-v2-sidebar-collapsed'

function WaveMark({ className }: { className?: string }) {
  return (
    <span
      className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-softer', className)}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5 text-gold" fill="none">
        <path
          d="M2 13c1.8-3 3.6-3 5.4 0s3.6 3 5.4 0 3.6-3 5.4 0"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M2 8c1.8-3 3.6-3 5.4 0s3.6 3 5.4 0s3.6-3 5.4 0"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"
        />
      </svg>
    </span>
  )
}

export default function CustomLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Persist collapsed state
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close drawer on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mobileOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileOpen])

  // Prevent body scroll when drawer open on mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="mawj-app">
      <div className="flex min-h-screen">

        {/* ── MOBILE OVERLAY ─────────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}

        {/* ── SIDEBAR ────────────────────────────────────────────── */}
        <aside
          ref={drawerRef}
          className={cn(
            // Base: hidden on mobile, shown as drawer when open
            'fixed inset-y-0 start-0 z-50 flex flex-col bg-card border-e border-border shadow-xl transition-transform duration-300 ease-out',
            // Desktop: sticky positioned, always visible
            'lg:relative lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-soft',
            // Width
            collapsed ? 'w-16' : 'w-64',
            // Mobile: slide in/out
            mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          )}
          style={{ direction: 'rtl' }}
        >
          {/* Brand header */}
          <div className={cn(
            'flex h-14 items-center border-b border-border shrink-0',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-4'
          )}>
            <WaveMark />
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight text-primary truncate">كمال للتجهيزات</span>
            )}
            {/* Close button - mobile only */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="ms-auto flex lg:hidden items-center justify-center rounded-lg w-8 h-8 text-muted-foreground hover:bg-accent"
              aria-label="إغلاق القائمة"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
            <NavList collapsed={collapsed} layoutId="nav-active-desktop" />
          </div>

          {/* Collapse toggle — desktop only */}
          <div className="hidden lg:block border-t border-border p-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
              className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {collapsed ? (
                  <><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>
                ) : (
                  <><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></>
                )}
              </svg>
              {!collapsed && <span>طي القائمة</span>}
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ──────────────────────────────────────────── */}
        <main className="flex flex-col flex-1 min-w-0 min-h-screen">
          {/* TopBar — passes hamburger props */}
          <TopBar onMenuClick={() => setMobileOpen(true)} />

          {/* Page content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden page rise" dir="rtl">
            {children}
          </div>
        </main>

      </div>
    </div>
  )
}
