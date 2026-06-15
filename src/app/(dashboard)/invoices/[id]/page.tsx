'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DOMPurify from 'dompurify'
import { useStore } from '@/lib/store'
import { formatCurrency, type InvoiceStatus } from '@/lib/data'
import { toast } from 'sonner'
import {
  ArrowRight,
  Pencil,
  CircleCheck,
  CircleX,
  MessageCircle,
  Download,
  Image as ImageIcon,
  User,
  MapPin,
  Phone,
  Calendar,
  FileText,
  Clock,
  Printer,
  Trash2,
  AlertCircle
} from 'lucide-react'
import confetti from 'canvas-confetti'

// ─── SaaS Status Config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  'مدفوعة':       { label: 'مدفوعة',       icon: CircleCheck, color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  'غير مدفوعة':   { label: 'غير مدفوعة',   icon: AlertCircle, color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200' },
  'مسودة':        { label: 'مسودة',        icon: Clock,       color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-300' },
  'ملغاة':        { label: 'ملغاة',        icon: CircleX,     color: 'text-gray-600',    bg: 'bg-gray-100',    border: 'border-gray-200' },
  'مدفوعة جزئياً': { label: 'جزئياً',    icon: CircleCheck, color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['مسودة']
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black ${cfg.color} ${cfg.bg} border ${cfg.border} shadow-sm`}>
      <Icon className="size-4" />
      {cfg.label}
    </span>
  )
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { invoices, clients, settings, updateInvoiceStatus, deleteInvoice, getProductImage, connectionStatus } = useStore()

  const [savingImage, setSavingImage] = useState(false)

  const foundInvoice = invoices.find(inv => inv.id === id)

  if (connectionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!foundInvoice) {
    return (
      <div className="bg-white border border-slate-200/60 rounded-[2rem] py-24 px-6 text-center max-w-md mx-auto mt-12 shadow-sm">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="size-10 text-slate-400" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">الفاتورة غير موجودة</h3>
        <p className="mt-3 text-base font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
          رقم المعرف الممرر غير مرتبط بأي فاتورة مسجلة
        </p>
        <button className="mt-8 h-12 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] inline-flex items-center justify-center" onClick={() => router.push('/invoices')}>
          العودة لقائمة الفواتير
        </button>
      </div>
    )
  }

  // Normalize items
  const rawItems = foundInvoice.items
  const normalizedItems = Array.isArray(rawItems)
    ? rawItems
    : (rawItems as any)?._items || []
  const invoice = { ...foundInvoice, items: normalizedItems as typeof foundInvoice.items }
  const client = clients.find(c => c.id === invoice.clientId)
  const hasCustomTemplate = !!settings.customInvoiceHtml?.trim()

  // Custom HTML template compiler
  function renderCustomTemplate() {
    const itemsHtml = invoice.items
      .map(
        (item, i) =>
          `<tr><td>${i + 1}</td><td>${item.productName}</td><td>${item.quantity}</td><td>${formatCurrency(item.unitPrice)}</td><td>${formatCurrency(item.total)}</td></tr>`
      )
      .join('\n')

    return (settings.customInvoiceHtml || '')
      .replace(/\{\{businessName\}\}/g, settings.businessName || '')
      .replace(/\{\{businessNameEn\}\}/g, settings.businessNameEn || '')
      .replace(/\{\{phone\}\}/g, settings.phone || '')
      .replace(/\{\{address\}\}/g, settings.address || '')
      .replace(/\{\{logo\}\}/g, settings.logo ? `<img src="${settings.logo}" style="height:50px" />` : '')
      .replace(/\{\{invoiceNumber\}\}/g, invoice.invoiceNumber)
      .replace(/\{\{date\}\}/g, invoice.createdAt)
      .replace(/\{\{status\}\}/g, invoice.status)
      .replace(/\{\{clientName\}\}/g, invoice.clientName)
      .replace(/\{\{clientPhone\}\}/g, client?.phone || '')
      .replace(/\{\{clientAddress\}\}/g, client?.address || '')
      .replace(/\{\{subtotal\}\}/g, formatCurrency(invoice.subtotal))
      .replace(/\{\{discount\}\}/g, formatCurrency(invoice.discountAmount))
      .replace(/\{\{total\}\}/g, formatCurrency(invoice.total))
      .replace(/\{\{notes\}\}/g, invoice.notes || '')
      .replace(/\{\{currencySymbol\}\}/g, settings.currencySymbol || '')
      .replace(/\{\{items\}\}/g, itemsHtml)
  }

  const sanitizedHtml = hasCustomTemplate
    ? DOMPurify.sanitize(renderCustomTemplate(), {
        FORBID_TAGS: ['script', 'style'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick'],
      })
    : ''

  // Actions Handlers
  async function handleExportPDF() {
    toast.success('جاري تصدير الفاتورة كـ PDF...')
    try {
      const { exportInvoicePDF } = await import('@/lib/pdf')
      await exportInvoicePDF(invoice, settings, { phone: client?.phone, address: client?.address })
      toast.success('تم تصدير ملف PDF بنجاح')
    } catch (e) {
      console.error('PDF export error:', e)
      toast.error('فشل تصدير الفاتورة: ' + (e instanceof Error ? e.message : 'خطأ غير معروف'))
    }
  }

  // SAVE AS IMAGE PNG
  async function handleSaveAsImage() {
    setSavingImage(true)
    toast.success('جاري تجهيز صورة الفاتورة للتحميل...')
    try {
      const html2canvas = (await import('html2canvas')).default
      const element = document.getElementById('invoice-document')
      if (!element) {
        toast.error('لم يتم العثور على حاوية الفاتورة')
        setSavingImage(false)
        return
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      })

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `Fatora_${invoice.invoiceNumber}.png`
      link.href = dataUrl
      link.click()
      
      toast.success('تم حفظ الفاتورة كصورة PNG بنجاح')
    } catch (err) {
      console.error('Image export error:', err)
      toast.error('فشل حفظ الفاتورة كصورة')
    } finally {
      setSavingImage(false)
    }
  }

  // WHATSAPP SHARE API
  async function shareWhatsApp() {
    try {
      const { shareInvoiceWhatsApp } = await import('@/lib/pdf')
      shareInvoiceWhatsApp(invoice, settings)
      toast.success('تم فتح نافذة مشاركة واتساب')
    } catch (err) {
      console.error(err)
      toast.error('فشل مشاركة الفاتورة عبر واتساب')
    }
  }

  function togglePaid() {
    const cycle: Record<string, InvoiceStatus> = {
      'غير مدفوعة': 'مدفوعة جزئياً',
      'مدفوعة جزئياً': 'مدفوعة',
      'مدفوعة': 'غير مدفوعة',
      'مسودة': 'غير مدفوعة',
      'ملغاة': 'غير مدفوعة',
    }
    const newStatus = cycle[invoice.status] || 'غير مدفوعة'
    updateInvoiceStatus(invoice.id, newStatus)
    toast.success(`تم تغيير حالة الدفع إلى: ${newStatus}`)
    
    if (newStatus === 'مدفوعة') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981']
      })
    }
  }

  function handleDeleteInvoice() {
    if (confirm('هل أنت متأكد من حذف هذه الفاتورة نهائياً؟')) {
      deleteInvoice(invoice.id)
      toast.success('تم حذف الفاتورة بنجاح')
      router.push('/invoices')
    }
  }

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen relative" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Top Header info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95" onClick={() => router.push('/invoices')}>
              <ArrowRight className="size-5" />
            </button>
            <div>
              <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">فاتورة بيع</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">{invoice.invoiceNumber}</h1>
            </div>
          </div>
          <div>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Main floating paper document look */}
        <div className="relative w-full overflow-hidden rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-slate-200/60 bg-white">
          <div 
            className="p-6 md:p-14 lg:p-20 relative transition-all"
            id="invoice-document"
            style={{ direction: 'rtl' }}
          >
          {hasCustomTemplate ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
          ) : (
            <div className="space-y-10">
              {/* 1. Brand Logo & Org Details */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                <div className="flex items-center gap-5">
                  {settings.logo && (
                    <img 
                      src={settings.logo} 
                      alt="Logo" 
                      className="size-20 rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0" 
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{settings.businessName}</h2>
                    {settings.businessNameEn && <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{settings.businessNameEn}</p>}
                    <p className="text-sm font-medium text-slate-500 mt-2">{settings.address}</p>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">هاتف: <span dir="ltr" className="font-mono font-bold text-slate-700">{settings.phone}</span></p>
                  </div>
                </div>

                <div className="text-right sm:text-left">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block mb-2">فاتورة مبيعات</span>
                  <h3 className="text-2xl font-black text-indigo-600 font-mono mt-1">{invoice.invoiceNumber}</h3>
                  <div className="mt-4 text-sm font-bold text-slate-500 space-y-1.5">
                    <p className="flex items-center gap-2 justify-end sm:justify-start">
                      <Calendar className="size-4 text-indigo-400" />
                      <span className="font-mono">{invoice.createdAt}</span>
                    </p>
                    <p className="flex items-center gap-2 justify-end sm:justify-start">
                      <Clock className="size-4 text-indigo-400" />
                      <span>توقيت التسجيل</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-slate-200" />

              {/* 2. Bill to info */}
              <div className="p-8 bg-slate-50/80 border border-slate-200 rounded-[2rem] mt-8 shadow-sm">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block mb-5 flex items-center gap-2">
                  <User className="size-4" />
                  معلومات العميل
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-black text-slate-900">
                      {invoice.clientName}
                    </h4>
                    {client && (
                      <p className="text-sm font-bold text-slate-600 mt-3 flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 w-fit shadow-sm" dir="ltr">
                        <Phone className="size-4 text-slate-400 shrink-0" />
                        <span className="font-mono tracking-wider">{client.phone}</span>
                      </p>
                    )}
                  </div>
                  {client?.address && (
                    <div className="text-sm font-bold text-slate-600 sm:border-r-2 sm:border-slate-200 sm:pr-6 space-y-2">
                      <span className="text-xs font-black text-slate-400 block uppercase tracking-widest">العنوان:</span>
                      <p className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm leading-relaxed">
                        <MapPin className="size-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{client.address}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Items list Table */}
              <div className="mt-8 rounded-[2rem] border border-slate-200 overflow-hidden bg-white shadow-sm">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="px-6 py-4 w-[6%]">#</th>
                      <th className="px-6 py-4 w-[54%]">المنتج</th>
                      <th className="px-6 py-4 w-[12%] text-center">الكمية</th>
                      <th className="px-6 py-4 w-[13%] text-center">السعر</th>
                      <th className="px-6 py-4 w-[15%] text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, idx) => {
                      const img = getProductImage(item.productId)
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {img && (
                                <img 
                                  src={img} 
                                  alt="" 
                                  className="size-12 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0" 
                                />
                              )}
                              <div>
                                <span className="font-bold text-base text-slate-900 block leading-tight">{item.productName}</span>
                                {item.description && (
                                  <p className="text-xs font-bold text-slate-500 mt-1">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-black font-mono text-slate-700 bg-slate-50/50">{item.quantity}</td>
                          <td className="px-6 py-4 text-center font-black font-mono text-slate-700">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-6 py-4 text-left font-black font-mono text-indigo-600">{formatCurrency(item.total)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 4. Calculations Summary */}
              <div className="flex justify-end pt-8 border-t-2 border-slate-100 mt-8">
                <div className="w-full sm:w-[420px] bg-slate-50 border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-500">المبلغ الفرعي:</span>
                      <span className="font-mono font-black text-slate-800 text-lg">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-inner">
                        <span className="font-black text-sm">
                          الخصم {invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}:
                        </span>
                        <span className="font-black font-mono text-lg tracking-tight">− {formatCurrency(invoice.discountAmount)}</span>
                      </div>
                    )}
                    {(invoice.taxAmount ?? 0) > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">الضريبة ({settings.taxRate}%):</span>
                        <span className="font-mono font-black text-slate-800 text-lg">+{formatCurrency(invoice.taxAmount)}</span>
                      </div>
                    )}
                    <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-end">
                      <span className="text-base font-black text-slate-900 uppercase tracking-widest">الإجمالي المستحق</span>
                      <span className="font-black text-4xl text-indigo-600 font-mono tracking-tight">{formatCurrency(invoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Notes */}
              {invoice.notes && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-[2rem] mt-8 shadow-sm">
                  <span className="text-xs font-black text-amber-600 block uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertCircle className="size-4" />
                    ملاحظات الفاتورة:
                  </span>
                  <p className="text-sm font-bold text-amber-900 leading-relaxed">{invoice.notes}</p>
                </div>
              )}

              {/* Business Default notes */}
              {settings.invoiceNotes && (
                <div className="text-center text-sm font-bold text-slate-400 pt-8 mt-12 border-t-2 border-slate-100 leading-relaxed">
                  {settings.invoiceNotes}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ANCHORED GLASSMORPHIC ACTION TOOLBAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-2 flex items-center gap-2 print:hidden w-[95%] sm:w-auto overflow-x-auto justify-start sm:justify-center hide-scrollbar">
        
        <Link 
          href={`/invoices/new?edit=${invoice.id}`}
          className="h-12 px-4 rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
        >
          <Pencil className="size-4" />
          <span className="hidden sm:inline">تعديل</span>
        </Link>

        <button
          onClick={togglePaid}
          className="h-12 px-4 rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
        >
          {invoice.status === 'مدفوعة' ? (
            <>
              <CircleX className="size-4 text-warning" />
              <span className="hidden sm:inline">إلغاء الدفع</span>
            </>
          ) : (
            <>
              <CircleCheck className="size-4 text-emerald-600" />
              <span className="hidden sm:inline">تحديد كمدفوعة</span>
            </>
          )}
        </button>

        <button
          onClick={shareWhatsApp}
          className="h-12 px-4 rounded-xl text-white bg-[#25D366] hover:bg-[#1DA851] font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
        >
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">واتساب</span>
        </button>

        <button
          onClick={handleSaveAsImage}
          disabled={savingImage}
          className="h-12 px-4 rounded-xl text-white bg-sky-500 hover:bg-sky-600 font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm disabled:opacity-50"
        >
          <ImageIcon className="size-4" />
          <span className="hidden sm:inline">{savingImage ? 'جاري...' : 'صورة'}</span>
        </button>

        <button
          onClick={handleExportPDF}
          className="h-12 px-4 rounded-xl text-white bg-rose-500 hover:bg-rose-600 font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">PDF</span>
        </button>

        <button
          onClick={() => window.print()}
          className="h-12 px-4 rounded-xl text-white bg-slate-500 hover:bg-slate-600 font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
        >
          <Printer className="size-4" />
          <span className="hidden sm:inline">طباعة</span>
        </button>

        <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block shrink-0" />

        <button
          onClick={handleDeleteInvoice}
          className="h-12 px-4 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
        >
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">حذف</span>
        </button>
      </div>
    </div>
  )
}
