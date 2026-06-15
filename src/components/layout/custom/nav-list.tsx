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
      { label: 'العملاء', href: '/clients', icon: Users },
      { label: 'الطلبات', href: '/orders', icon: ShoppingBag }
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
    label: 'المالية',
    items: [
      { label: 'الحسابات', href: '/accounting', icon: Wallet },
      { label: 'التقارير', href: '/reports', icon: PieChart }
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
    <nav aria-label="التنقّل الرئيسي" className="flex-1 overflow-y-auto px-3 py-2">
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-4">
          {!collapsed && (
            <p className="mb-1 px-2 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map(item => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`))
              const Icon = item.icon

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip content={item.label} side="left">
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-label={item.label}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card justify-center w-full',
                          active
                            ? 'bg-gold-soft font-medium text-accent-foreground'
                            : 'text-foreground/80 hover:bg-accent/60 hover:text-foreground'
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId={layoutId}
                            className="absolute inset-y-1 start-0 w-1 rounded-full bg-gold"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <Icon className="size-4 shrink-0" />
                      </Link>
                    </Tooltip>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card',
                        active
                          ? 'bg-gold-soft font-medium text-accent-foreground'
                          : 'text-foreground/80 hover:bg-accent/60 hover:text-foreground'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={layoutId}
                          className="absolute inset-y-1 start-0 w-1 rounded-full bg-gold"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
