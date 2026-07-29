'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, AlertTriangle, ShoppingCart, Settings } from 'lucide-react'
import { NAV_ITEMS } from './nav-list'
import { useEffect, useRef, useState } from 'react'
import { CommandPalette } from '@/components/command-palette'
import { useStore } from '@/lib/store'

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const current = NAV_ITEMS.find(i => pathname === i.href || (i.href !== '/' && pathname.startsWith(`${i.href}/`)))
  const { products, purchaseOrders } = useStore()

  const [dateStr, setDateStr] = useState('')
  useEffect(() => {
    const d = new Date()
    setDateStr(d.toLocaleDateString('ar-SY', { numberingSystem: 'latn', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
  }, [])

  const lowStock = products.filter(p => p.stock <= p.minStock)
  const pendingOrders = purchaseOrders.filter(po => po.status === 'ordered')
  const alertCount = lowStock.length + pendingOrders.length

  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    function onPointerDown(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    function onEscape(e: KeyboardEvent) { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [notifOpen])

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

        {/* Notifications — real alerts (low stock + pending purchase orders), anchored dropdown, no modal */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            aria-label="الإشعارات"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen(v => !v)}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-foreground/80 hover:bg-accent hover:text-foreground outline-none transition-colors"
          >
            <Bell className="size-4" />
            {alertCount > 0 && (
              <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[length:var(--text-2xs)] font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-80 z-50 rounded-2xl border shadow-2xl overflow-hidden"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-sm font-bold">الإشعارات</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alertCount === 0 ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">لا توجد إشعارات جديدة</p>
                ) : (
                  <>
                    {lowStock.length > 0 && (
                      <Link
                        href="/inventory"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors border-b"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <AlertTriangle className="size-4 mt-0.5 shrink-0 text-rose-500" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold">{lowStock.length} منتجات في مخزون منخفض</p>
                          <p className="text-xs text-muted-foreground truncate">{lowStock.slice(0, 3).map(p => p.name).join('، ')}</p>
                        </div>
                      </Link>
                    )}
                    {pendingOrders.length > 0 && (
                      <Link
                        href="/purchases"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors"
                      >
                        <ShoppingCart className="size-4 mt-0.5 shrink-0 text-amber-500" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold">{pendingOrders.length} طلبات شراء بانتظار الاستلام</p>
                          <p className="text-xs text-muted-foreground">راجع صفحة المشتريات لتأكيد الاستلام</p>
                        </div>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account — links to Settings (no auth/account system in this app) */}
        <Link
          href="/settings"
          aria-label="الإعدادات"
          className="flex items-center gap-2 border-s border-border ps-2 outline-none group"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-primary-foreground transition-transform group-hover:scale-105">
            ك
          </span>
          <span className="hidden flex-col text-start xl:flex">
            <span className="text-xs font-semibold leading-tight">كمال</span>
            <span className="text-[length:var(--text-2xs)] text-muted-foreground leading-none flex items-center gap-1">
              <Settings className="size-2.5" /> الإعدادات
            </span>
          </span>
        </Link>
      </div>
    </header>
  )
}
