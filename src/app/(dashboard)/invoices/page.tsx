'use client'

import { useState, useMemo } from 'react'
import { useDebounce } from '@/lib/use-debounce'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { formatCurrency, type Invoice } from '@/lib/data'
import { toast } from 'sonner'
import { exportCSV } from '@/lib/export'
import { DateRangeExportButton, type DateRange } from '@/components/date-range-picker'
import { AnimatedCounter } from "@/components/animated-counter"
import { motion } from "framer-motion"
import { EmptyState } from '@/components/empty-state'
import {
  Plus, Search, Download, Trash2, CheckCircle2,
  FileText, MessageCircle, X, TrendingUp, Calendar, ChevronDown, Clock, AlertCircle, Pencil, ArrowRight, Copy
} from 'lucide-react'

// ─── SaaS Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  'مدفوعة':       { label: 'مدفوعة',       icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  'غير مدفوعة':   { label: 'غير مدفوعة',   icon: AlertCircle,  color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200' },
  'مسودة':        { label: 'مسودة',        icon: Clock,        color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-300' },
  'ملغاة':        { label: 'ملغاة',        icon: X,            color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-200' },
  'مدفوعة جزئياً': { label: 'جزئياً',    icon: CheckCircle2, color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['مسودة']
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${cfg.color} ${cfg.bg} border ${cfg.border} shadow-sm`}>
      <Icon className="size-3.5" />
      {cfg.label}
    </span>
  )
}

export default function InvoicesPage() {
  const router = useRouter()
  const { invoices, deleteInvoice, updateInvoiceStatus, addInvoice, settings, clients, connectionStatus } = useStore()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('الكل')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')

  // ─── Filter & Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = invoices.filter(inv => {
      const q = debouncedSearch.toLowerCase()
      const matchSearch =
        debouncedSearch === '' ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'الكل' ||
        (statusFilter === 'مسودات' ? inv.status === 'مسودة' : inv.status === statusFilter)
      const matchDateFrom = !dateFrom || inv.createdAt >= dateFrom
      const matchDateTo   = !dateTo   || inv.createdAt <= dateTo
      return matchSearch && matchStatus && matchDateFrom && matchDateTo
    })

    switch (sortBy) {
      case 'date-asc':    return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      case 'date-desc':   return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      case 'amount-asc':  return [...list].sort((a, b) => a.total - b.total)
      case 'amount-desc': return [...list].sort((a, b) => b.total - a.total)
      case 'client':      return [...list].sort((a, b) => a.clientName.localeCompare(b.clientName, 'ar'))
      default: return list
    }
  }, [invoices, debouncedSearch, statusFilter, dateFrom, dateTo, sortBy])

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const totalInvoices = invoices.length
  const totalRevenue  = invoices.filter(i => i.status === 'مدفوعة').reduce((s, i) => s + i.total, 0)
  const unpaidTotal   = invoices.filter(i => i.status === 'غير مدفوعة').reduce((s, i) => s + i.total, 0)
  const unpaidCount   = invoices.filter(i => i.status === 'غير مدفوعة').length
  const draftCount    = invoices.filter(i => i.status === 'مسودة').length

  const tabStatuses = [
    { label: 'الكل',          value: 'الكل',        count: invoices.length },
    { label: 'مدفوعة',        value: 'مدفوعة',       count: invoices.filter(i => i.status === 'مدفوعة').length },
    { label: 'غير مدفوعة',    value: 'غير مدفوعة',   count: unpaidCount },
    { label: 'مسودات',        value: 'مسودات',       count: draftCount },
    { label: 'ملغاة',         value: 'ملغاة',        count: invoices.filter(i => i.status === 'ملغاة').length },
  ]

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function handleDelete(inv: Invoice) {
    const snapshot = {
      clientId: inv.clientId, clientName: inv.clientName, items: inv.items,
      subtotal: inv.subtotal, discountType: inv.discountType, discountValue: inv.discountValue,
      discountAmount: inv.discountAmount, taxAmount: inv.taxAmount, total: inv.total,
      status: inv.status, notes: inv.notes,
    }
    deleteInvoice(inv.id)
    toast.success(`تم حذف الفاتورة "${inv.invoiceNumber}"`, {
      duration: 6000,
      action: { label: 'تراجع', onClick: () => addInvoice(snapshot) },
    })
  }

  async function handleDownloadPDF(inv: Invoice) {
    try {
      const { exportInvoicePDF } = await import('@/lib/pdf')
      const client = clients.find(c => c.id === inv.clientId)
      await exportInvoicePDF(inv, settings, { phone: client?.phone, address: client?.address })
      toast.success('تم تحميل الفاتورة')
    } catch (err) {
      toast.error('فشل تحميل ملف PDF')
    }
  }

  function handleDuplicate(inv: Invoice) {
    const snapshot = {
      clientId: inv.clientId, clientName: inv.clientName, items: inv.items,
      subtotal: inv.subtotal, discountType: inv.discountType, discountValue: inv.discountValue,
      discountAmount: inv.discountAmount, taxAmount: inv.taxAmount, total: inv.total,
      status: 'مسودة' as const, notes: inv.notes,
    }
    addInvoice(snapshot)
    toast.success('تم إنشاء نسخة مسودة من الفاتورة')
  }

  function handleShare(inv: Invoice) {
    const client = clients.find(c => c.id === inv.clientId)
    const phone = client?.phone || ''
    const emoji = inv.status === 'مدفوعة' ? '✅' : inv.status === 'غير مدفوعة' ? '🔴' : '🔶'
    const text = `مرحباً ${inv.clientName}،\n\nمرفق تفاصيل الفاتورة رقم ${inv.invoiceNumber}\n💰 الإجمالي: ${formatCurrency(inv.total)}\nحالة الفاتورة: ${inv.status} ${emoji}\n\nشكراً لثقتكم بنا!`
    const url = phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  function handleExport() {
    exportCSV('invoices',
      ['رقم الفاتورة', 'العميل', 'التاريخ', 'المنتجات', 'الإجمالي', 'الحالة'],
      filtered.map(inv => [inv.invoiceNumber, inv.clientName, inv.createdAt, String(inv.items.length), String(inv.total), inv.status])
    )
    toast.success('تم تصدير الفواتير كملف CSV')
  }

  function shareWhatsAppSummary() {
    const paid   = invoices.filter(i => i.status === 'مدفوعة')
    const unpaid = invoices.filter(i => i.status === 'غير مدفوعة')
    const draft  = invoices.filter(i => i.status === 'مسودة')
    const lines = [
      `🧾 *تقرير الفواتير - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-SY', { numberingSystem: 'latn' })}`,
      '',
      `📊 *الملخص:*`,
      `  • إجمالي الفواتير: ${filtered.length}`,
      `  • 💰 مجموع المحصّل: ${settings.currencySymbol}${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
      `  • ✅ مدفوعة: ${paid.length}`,
      `  • ⏳ غير مدفوعة: ${unpaid.length} (${settings.currencySymbol}${unpaid.reduce((s, i) => s + i.total, 0).toLocaleString('en-US')})`,
      ...(draft.length > 0 ? [`  • 📝 مسودات: ${draft.length}`] : []),
    ]
    lines.push('', `📋 *آخر 5 فواتير:*`)
    filtered.slice(0, 5).forEach((inv, i) => {
      const emoji = inv.status === 'مدفوعة' ? '✅' : inv.status === 'غير مدفوعة' ? '🔴' : '🔶'
      lines.push(`${i + 1}. ${inv.invoiceNumber} | ${inv.clientName} | ${emoji} ${settings.currencySymbol}${inv.total.toLocaleString('en-US')}`)
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  function shareAllOverdue() {
    const overdue = invoices.filter(i => i.status === 'غير مدفوعة')
    if (overdue.length === 0) {
      toast.success('لا توجد فواتير متأخرة الدفع حالياً')
      return
    }
    const lines = [
      `🚨 *تذكير بالفواتير المتأخرة*`,
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-SY', { numberingSystem: 'latn' })}`,
      '',
      `يوجد ${overdue.length} فاتورة غير مدفوعة بقيمة إجمالية ${settings.currencySymbol}${overdue.reduce((s, i) => s + i.total, 0).toLocaleString('en-US')}`,
      '',
      `تفاصيل المتأخرات:`
    ]
    overdue.forEach((inv, i) => {
      lines.push(`${i + 1}. ${inv.invoiceNumber} - ${inv.clientName} - ${settings.currencySymbol}${inv.total.toLocaleString('en-US')}`)
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  if (connectionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-6">
              <FileText className="size-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">المبيعات والفواتير</h1>
            <p className="mt-2 text-base font-medium text-slate-500 max-w-lg leading-relaxed">
              إدارة الفواتير، متابعة التحصيلات المالية، ومراقبة حالة المبيعات بمرونة.
            </p>
          </div>
          
          <div className="flex flex-nowrap items-center gap-3 w-full md:w-auto">
            <button
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-sky-500 border border-sky-600 text-white font-bold hover:bg-sky-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onClick={handleExport}
            >
              <Download className="size-5" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>
            
            <button
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-[#25D366] text-white border border-[#1DA851] font-bold hover:bg-[#1DA851] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onClick={shareWhatsAppSummary}
            >
              <MessageCircle className="size-5" />
              <span className="hidden sm:inline">ملخص واتساب</span>
            </button>

            <DateRangeExportButton
              label="تقرير PDF"
              className="flex-1 md:flex-none h-14 px-6 rounded-2xl bg-rose-500 border border-rose-600 text-white font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onExport={async (range: DateRange) => {
                try {
                  const { exportSalesReportPDF } = await import('@/lib/pdf')
                  await exportSalesReportPDF(invoices, range, settings)
                  toast.success('تم تصدير التقرير')
                } catch { toast.error('فشل التصدير') }
              }}
            />
            
            <Link
              href="/invoices/new"
              className="w-full md:w-auto h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
            >
              <Plus className="size-6" />
              <span>فاتورة جديدة</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex flex-col gap-4 hover:border-indigo-200 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">إجمالي الفواتير</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight"><AnimatedCounter value={totalInvoices} /></p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex flex-col gap-4 hover:border-emerald-200 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">مبيعات محصلة</p>
              <p className="text-3xl font-black text-slate-900 font-mono tracking-tight"><AnimatedCounter value={totalRevenue} format={formatCurrency} /></p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex flex-col gap-4 hover:border-rose-200 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">الرصيد المستحق</p>
              <p className="text-3xl font-black text-slate-900 font-mono tracking-tight"><AnimatedCounter value={unpaidTotal} format={formatCurrency} /></p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm flex flex-col gap-4 hover:border-slate-300 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">مسودات</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight"><AnimatedCounter value={draftCount} /></p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[2rem] p-4 sm:p-6 border border-slate-200/60 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5 relative w-full">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Search className="size-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="البحث برقم الفاتورة أو العميل..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="sm:col-span-3 relative w-full">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 pr-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              >
                <option value="date-desc">الأحدث أولاً</option>
                <option value="date-asc">الأقدم أولاً</option>
                <option value="amount-desc">الأعلى قيمة</option>
                <option value="amount-asc">الأقل قيمة</option>
                <option value="client">اسم العميل</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <ChevronDown className="size-4 text-slate-400" />
              </div>
            </div>

            <div className="sm:col-span-4 w-full">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-sm">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-sm py-2 px-3 focus:outline-none font-bold text-slate-700"
                />
                <span className="text-slate-300 font-bold shrink-0">|</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-sm py-2 px-3 focus:outline-none font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {tabStatuses.map(tab => {
              const isActive = statusFilter === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        {filtered.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] py-24 px-6 text-center shadow-sm">
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="size-10 text-slate-400" />
            </motion.div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">لا توجد فواتير مطابقة</h3>
            <p className="mt-3 text-base font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
              لم يتم العثور على أي فواتير تطابق معايير البحث والفلترة المحددة.
            </p>
            <Link
              href="/invoices/new"
              className="mt-8 h-12 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] inline-flex items-center justify-center gap-2"
            >
              <Plus className="size-5" />
              <span>فاتورة جديدة</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-100 text-slate-500 font-bold shadow-sm">
                    <tr>
                      <th className="px-6 py-4 rounded-tr-[2rem]">رقم الفاتورة</th>
                      <th className="px-6 py-4">العميل</th>
                      <th className="px-6 py-4">التاريخ</th>
                      <th className="px-6 py-4 text-left">الإجمالي</th>
                      <th className="px-6 py-4 text-center">الحالة</th>
                      <th className="px-6 py-4 text-center rounded-tl-[2rem]">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((inv) => (
                      <tr
                        key={inv.id}
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <span className="font-black text-slate-800 font-mono text-sm group-hover:text-indigo-600 transition-colors">
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-black text-lg shrink-0">
                              {inv.clientName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{inv.clientName}</span>
                              <span className="text-[10px] text-slate-500 font-bold block">{inv.items.length} أصناف</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-slate-500 font-bold">
                            {inv.createdAt}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-base font-mono text-indigo-600">{formatCurrency(inv.total)}</span>
                            {inv.discountAmount > 0 && (
                              <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-black mt-0.5 bg-emerald-50 px-2 py-0.5 rounded-md">
                                خصم {formatCurrency(inv.discountAmount)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black
                              ${inv.status === 'مدفوعة' ? 'bg-emerald-100 text-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                                inv.status === 'غير مدفوعة' ? 'bg-rose-100 text-rose-700 shadow-[0_0_10px_rgba(244,63,94,0.2)]' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                              {inv.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => router.push(`/invoices/new?edit=${inv.id}`)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="تعديل">
                              <Pencil className="size-5" />
                            </button>
                            <button onClick={() => handleDuplicate(inv)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="تكرار كمسودة">
                              <Copy className="size-5" />
                            </button>
                            <button onClick={() => handleShare(inv)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors" title="مشاركة واتساب">
                              <MessageCircle className="size-5" />
                            </button>
                            <button onClick={() => handleDownloadPDF(inv)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors" title="تحميل PDF">
                              <Download className="size-5" />
                            </button>
                            <button onClick={() => handleDelete(inv)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="حذف">
                              <Trash2 className="size-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filtered.map(inv => (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center font-black text-xl shrink-0">
                        {inv.clientName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-black text-slate-900 font-mono text-sm block">{inv.invoiceNumber}</span>
                        <span className="font-bold text-slate-600 text-sm block mt-0.5">{inv.clientName}</span>
                      </div>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mb-5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 inline-flex">
                    <Calendar className="size-3" />
                    <span className="font-mono">{inv.createdAt}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                    <span>{inv.items.length} أصناف</span>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                    <div className="flex flex-col text-left">
                       <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-0.5">الإجمالي</span>
                       <span className="font-black text-2xl font-mono text-indigo-600">{formatCurrency(inv.total)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleShare(inv)} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center transition-colors hover:bg-[#25D366]/10 hover:text-[#25D366]">
                        <MessageCircle className="size-4" />
                      </button>
                      <button onClick={() => handleDuplicate(inv)} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center transition-colors hover:bg-emerald-50 hover:text-emerald-600">
                        <Copy className="size-4" />
                      </button>
                      <button onClick={() => router.push(`/invoices/new?edit=${inv.id}`)} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center transition-colors hover:bg-indigo-50 hover:text-indigo-600">
                        <Pencil className="size-4" />
                      </button>
                      <button onClick={() => handleDownloadPDF(inv)} className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center transition-colors hover:bg-slate-100">
                        <Download className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
