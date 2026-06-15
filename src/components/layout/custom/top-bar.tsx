'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { NAV_ITEMS } from './nav-list'
import { useEffect, useState } from 'react'
import { CommandPalette } from '@/components/command-palette'

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const current = NAV_ITEMS.find(i => pathname === i.href || (i.href !== '/' && pathname.startsWith(`${i.href}/`)))
  
  const [dateStr, setDateStr] = useState('')
  useEffect(() => {
    const d = new Date()
    setDateStr(d.toLocaleDateString('ar-SY', { numberingSystem: 'latn', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur shrink-0 md:px-6" dir="rtl">
      
      {/* Hamburger — mobile only */}
      <button
        type="button"
        aria-label="فتح القائمة"
        onClick={onMenuClick}
        className="flex lg:hidden items-center justify-center size-9 rounded-xl text-foreground/80 hover:bg-accent hover:text-foreground outline-none transition-colors"
      >
        <Menu className="size-5" />
      </button>

      {/* Location label */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
        <span className="truncate text-sm font-semibold text-foreground">{current?.label ?? 'كمال للتجهيزات'}</span>
        {dateStr && (
          <>
            <span className="text-muted-foreground/30 hidden sm:inline">|</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">{dateStr}</span>
          </>
        )}
      </div>

      {/* Right action group */}
      <div className="ms-auto flex items-center gap-2">
        {/* Command Palette */}
        <CommandPalette />

        {/* Notifications */}
        <button
          type="button"
          aria-label="الإشعارات"
          className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-foreground/80 hover:bg-accent hover:text-foreground outline-none transition-colors"
        >
          <Bell className="size-4" />
          <span className="absolute end-2.5 top-2.5 size-1.5 rounded-full bg-gold" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 border-s border-border ps-2">
          <button
            type="button"
            aria-label="حساب المستخدم"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-primary-foreground outline-none"
          >
            ك
          </button>
          <div className="hidden flex-col text-start xl:flex">
            <span className="text-xs font-semibold leading-tight">كمال</span>
            <span className="text-[10px] text-muted-foreground leading-none">مسؤول النظام</span>
          </div>
        </div>
      </div>
    </header>
  )
}
