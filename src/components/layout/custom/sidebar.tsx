'use client'

import { useEffect, useState } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { NavList } from './nav-list'
import { cn } from '@/lib/utils'

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
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 8c1.8-3 3.6-3 5.4 0s3.6 3 5.4 0s3.6-3 5.4 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.45"
        />
      </svg>
    </span>
  )
}

function BrandLockup({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <WaveMark />
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight text-primary">كمال</span>
      )}
    </div>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true)
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-e border-border bg-card shadow-soft transition-[width] duration-300 md:flex',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center px-3">
        <BrandLockup collapsed={collapsed} />
      </div>

      <NavList collapsed={collapsed} layoutId="nav-active-desktop" />

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <PanelRightOpen className="size-4" />
          ) : (
            <>
              <PanelRightClose className="size-4" />
              <span>طي القائمة</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
