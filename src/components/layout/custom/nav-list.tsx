'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Receipt,
  Users,
  ShoppingBag,
  Package,
  Layers,
  Wallet,
  PieChart,
  Settings,
  Truck,
  ShoppingCart,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/tooltip'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'نظرة عامة',
    items: [
      { label: 'الرئيسية', href: '/', icon: LayoutDashboard }
    ]
  },
  {
    label: 'العمليات',
    items: [
      { label: 'الفواتير', href: '/invoices', icon: Receipt },
      { label: 'العملاء', href: '/clients', icon: Users }
    ]
  },
  {
    label: 'الكتالوج',
    items: [
      { label: 'المنتجات', href: '/inventory', icon: Package },
      { label: 'المجموعات', href: '/bundles', icon: Layers }
    ]
  },
  {
    label: 'المشتريات',
    items: [
      { label: 'الموردون', href: '/suppliers', icon: Truck },
      { label: 'طلبات الشراء', href: '/purchases', icon: ShoppingCart }
    ]
  },
  {
    label: 'المالية',
    items: [
      { label: 'الحسابات', href: '/accounting', icon: Wallet },
      { label: 'التقارير', href: '/reports', icon: PieChart }
    ]
  },
  {
    label: 'الذكاء الاصطناعي',
    items: [
      { label: 'المساعد الذكي', href: '/assistant', icon: Sparkles }
    ]
  },
  {
    label: 'الإدارة',
    items: [
      { label: 'الإعدادات', href: '/settings', icon: Settings }
    ]
  }
]

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

interface NavListProps {
  collapsed?: boolean
  onNavigate?: () => void
  layoutId?: string
}

export function NavList({ collapsed = false, onNavigate, layoutId = 'nav-active' }: NavListProps) {
  const pathname = usePathname()

  return (
    <nav aria-label="التنقّل الرئيسي" className="flex-1 overflow-y-auto px-3 py-3">
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-5">
          {!collapsed && (
            <p className="mb-2 px-3 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map(item => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`))
              const Icon = item.icon

              const linkInner = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400',
                    collapsed && 'justify-center px-0',
                    active
                      ? 'text-white'
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={layoutId}
                      className="absolute inset-0 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={cn('relative z-10 size-[18px] shrink-0 transition-transform group-hover:scale-110', active && 'text-white')} />
                  {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                </Link>
              )

              return (
                <li key={item.href}>
                  {collapsed ? <Tooltip content={item.label} side="left">{linkInner}</Tooltip> : linkInner}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
