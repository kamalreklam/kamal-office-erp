'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { type InvoiceStatus, formatCurrency, type Product } from '@/lib/data'
import { toast } from 'sonner'
import { Plus, Trash2, Search, X, ArrowRight, CheckCircle, Package, Layers, Sparkles, Percent, Calendar } from 'lucide-react'

interface LineItem {
  id: string
  productId: string
  productName: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  isBundle?: boolean
  bundleComponents?: { productId: string; productName: string; quantity: number }[]
  isTemporary?: boolean
  costPrice?: number
  showDescription?: boolean
}

// ─── Status Pipeline Component ──────────────────────────────────────────────
function ColorfulPipeline({ currentStatus }: { currentStatus: InvoiceStatus }) {
  const steps = [
    { id: 'مسودة', label: 'مسودة' },
    { id: 'غير مدفوعة', label: 'معتمدة' },
    { id: 'مدفوعة', label: 'مدفوعة' },
  ]
  
  const currentIndex = steps.findIndex(s => s.id === currentStatus)
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm">
      {steps.map((step, idx) => {
        const isActive = idx === activeIndex
        const isPast = idx < activeIndex
        return (
          <div key={step.id} className="flex items-center">
            <div className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
              isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : isPast ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'
            }`}>
              {step.label}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-4 h-0.5 mx-1 rounded-full ${isPast ? 'bg-indigo-300' : 'bg-slate-300'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const {
    clients, products, bundles, invoices, addInvoice, updateInvoice,
    settings, nextInvoiceNumber, connectionStatus
  } = useStore()

  const editingInvoice = editId ? invoices.find(i => i.id === editId) : null
  const isEdit = !!editingInvoice
  const invoiceNumber = isEdit ? editingInvoice?.invoiceNumber : nextInvoiceNumber()
  const currentStatus = isEdit ? editingInvoice!.status : 'مسودة'

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 'li-initial', productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false }
  ])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<(typeof clients)[0] | null>(null)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)
  
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(0)
  const [notes, setNotes] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [prefilled, setPrefilled] = useState(false)

  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(0)

  // Initialization
  useEffect(() => {
    if (!editingInvoice || prefilled) return
    const client = clients.find(c => c.id === editingInvoice.clientId)
    if (client) { setSelectedClient(client); setClientSearch(client.name) }
    const items: LineItem[] = editingInvoice.items.map(item => ({
      id: item.id, productId: item.productId, productName: item.productName,
      description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
      total: item.total, isBundle: item.isBundle, bundleComponents: item.bundleComponents,
      isTemporary: item.isTemporary, costPrice: item.costPrice, showDescription: !!item.description
    }))
    setLineItems(items.length > 0 ? items : [{ id: 'li-initial', productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false }])
    setDiscountType(editingInvoice.discountType)
    setDiscountValue(editingInvoice.discountValue)
    setNotes(editingInvoice.notes || '')
    setPrefilled(true)
  }, [editingInvoice, clients, prefilled])

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const clampedDiscount = discountType === 'percentage' ? Math.min(discountValue, 100) : Math.min(discountValue, subtotal)
  const discountAmount = discountType === 'percentage' ? subtotal * (clampedDiscount / 100) : clampedDiscount
  const taxableAmount = subtotal - discountAmount
  const taxAmount = settings.taxEnabled ? taxableAmount * (settings.taxRate / 100) : 0
  const total = taxableAmount + taxAmount

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const prodList = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, type: 'product' as const, product: p }))
    const bundleList = bundles.filter(b => b.name.toLowerCase().includes(q))
      .map(b => ({
        id: b.id, name: `${b.name} (حزمة)`,
        price: b.items.reduce((s, it) => s + (it.sellingPrice ?? products.find(p => p.id === it.productId)?.price ?? 0) * it.quantity, 0) * (1 - b.discount / 100),
        stock: Math.min(...b.items.map(it => { const p = products.find(pr => pr.id === it.productId); return p ? Math.floor(p.stock / it.quantity) : 0 })),
        type: 'bundle' as const, bundle: b
      }))
    return [...prodList, ...bundleList]
  }, [products, bundles, searchQuery])

  function addNewRow() {
    setLineItems(prev => [...prev, { id: `li-${Date.now()}`, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false }])
  }

  function addTemporaryRow() {
    setLineItems(prev => [...prev, { id: `li-${Date.now()}`, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, isTemporary: true, showDescription: false }])
  }

  function removeRow(id: string) {
    setLineItems(prev => {
      const filtered = prev.filter(item => item.id !== id)
      return filtered.length > 0 ? filtered : [{ id: 'li-initial', productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false }]
    })
  }

  function updateItem(id: string, updates: Partial<LineItem>) {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, ...updates }
      if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
        updated.total = updated.quantity * updated.unitPrice
      }
      return updated
    }))
  }

  function quickAddItem(opt: { id: string; name: string; price: number; type: 'product' | 'bundle', product?: Product, bundle?: any }) {
    setLineItems(prev => {
      const emptyRowIdx = prev.findIndex(r => !r.productId && !r.isTemporary && !r.productName)
      const bundleDesc = opt.type === 'bundle' ? `يحتوي على: ${(opt.bundle?.items || []).map((i:any) => { const p = products.find(pr=>pr.id===i.productId); return p?`${p.name} (x${i.quantity})`:''; }).filter(Boolean).join('، ')}` : ''
      const desc = opt.type === 'bundle' ? bundleDesc : (opt.product?.description || '')

      const newItem: LineItem = {
        id: emptyRowIdx >= 0 ? prev[emptyRowIdx].id : `li-${Date.now()}`,
        productId: opt.id, productName: opt.name,
        description: desc,
        quantity: 1, unitPrice: opt.price, total: opt.price,
        isBundle: opt.type === 'bundle', bundleComponents: opt.type === 'bundle' ? opt.bundle?.items : undefined,
        isTemporary: false, costPrice: opt.type === 'product' ? opt.product?.costPrice : 0,
        showDescription: !!desc
      }
      const newItems = [...prev]
      if (emptyRowIdx >= 0) newItems[emptyRowIdx] = newItem
      else newItems.push(newItem)
      newItems.push({ id: `li-${Date.now() + 1}`, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false })
      return newItems
    })
    toast.success(`تم إدراج ${opt.name}`)
  }

  function selectAutocompleteItem(rowId: string, opt: typeof filteredItems[0]) {
    setLineItems(prev => prev.map((item, idx, arr) => {
      if (item.id !== rowId) return item
      if (idx === arr.length - 1) setTimeout(addNewRow, 10)
      
      const bundleDesc = opt.type === 'bundle' ? `يحتوي على: ${(opt.bundle?.items || []).map((i:any) => { const p = products.find(pr=>pr.id===i.productId); return p?`${p.name} (x${i.quantity})`:''; }).filter(Boolean).join('، ')}` : ''
      const desc = opt.type === 'bundle' ? bundleDesc : (opt.product?.description || '')

      return {
        id: item.id, productId: opt.id, productName: opt.name,
        description: desc,
        quantity: item.quantity, unitPrice: opt.price, total: item.quantity * opt.price,
        isBundle: opt.type === 'bundle', bundleComponents: opt.type === 'bundle' ? opt.bundle?.items : undefined,
        isTemporary: false, costPrice: opt.type === 'product' ? opt.product?.costPrice : 0,
        showDescription: !!desc
      }
    }))
    setActiveSearchRowId(null); setSearchQuery(''); setFocusedSearchIndex(0)
  }

  function handleAddTemporaryRow(rowId: string) {
    setLineItems(prev => prev.map((item, idx, arr) => {
      if (item.id !== rowId) return item
      if (idx === arr.length - 1) setTimeout(addNewRow, 10)
      return { ...item, productId: '', productName: searchQuery || 'منتج مؤقت', isTemporary: true, unitPrice: 0, costPrice: 0, total: 0 }
    }))
    setActiveSearchRowId(null); setSearchQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, rowId: string) {
    const listLength = filteredItems.length
    if (activeSearchRowId !== rowId) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedSearchIndex(prev => (listLength > 0 ? (prev + 1) % listLength : 0)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedSearchIndex(prev => (listLength > 0 ? (prev - 1 + listLength) % listLength : 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (listLength > 0 && focusedSearchIndex >= 0 && focusedSearchIndex < listLength) selectAutocompleteItem(rowId, filteredItems[focusedSearchIndex])
      else if (searchQuery.trim()) handleAddTemporaryRow(rowId)
    }
    else if (e.key === 'Escape') setActiveSearchRowId(null)
  }

  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClientDrop(false)
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [])

  function handleSave(status: InvoiceStatus) {
    if (!selectedClient) { toast.error('يرجى اختيار العميل'); return }
    const validItems = lineItems.filter(li => li.productId || li.isTemporary)
    if (validItems.length === 0) { toast.error('يرجى إضافة سطر واحد على الأقل'); return }
    if (validItems.some(li => li.isTemporary && !li.productName.trim())) { toast.error('أكمل تفاصيل المنتجات المؤقتة'); return }

    const invoiceData = {
      clientId: selectedClient.id, clientName: selectedClient.name,
      items: validItems.map(li => ({
        id: li.id, productId: li.productId, productName: li.productName,
        description: li.description, quantity: li.quantity, unitPrice: li.unitPrice,
        total: li.total, isBundle: li.isBundle, bundleComponents: li.bundleComponents,
        isTemporary: li.isTemporary, costPrice: li.costPrice, discount: 0
      })),
      subtotal, discountType, discountValue, discountAmount, taxAmount, total, status, notes,
    }

    if (isEdit && editId) {
      updateInvoice(editId, invoiceData)
      toast.success('تم حفظ التعديلات بنجاح')
      router.push(`/invoices/${editId}`)
    } else {
      addInvoice(invoiceData)
      toast.success('تم إنشاء الفاتورة بنجاح')
      router.push('/invoices')
    }
  }

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    return q ? clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)) : clients
  }, [clients, clientSearch])

  if (connectionStatus === 'loading') return <div className="p-8 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>

  const inputClass = "w-full bg-white border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none py-3.5 px-4 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm"

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      
      {/* ── Desktop Top Action Bar ──────────────────────────────────────────── */}
      <div className="hidden md:flex sticky top-4 z-[100] px-4 mb-8">
        <div className="max-w-6xl mx-auto w-full bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-float p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/invoices')} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-md">
              <ArrowRight className="size-5" />
            </button>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-l from-indigo-700 to-blue-600 bg-clip-text text-transparent">
                {isEdit ? `تعديل الفاتورة ${invoiceNumber}` : 'فاتورة جديدة'}
              </h1>
              <p className="text-xs font-bold text-indigo-400/80 mt-0.5">رقم المرجع: {invoiceNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ColorfulPipeline currentStatus={currentStatus} />
            <div className="h-8 w-px bg-indigo-100" />
            <div className="flex gap-2">
              {!isEdit && (
                <button onClick={() => handleSave('مسودة')} className="h-12 px-6 rounded-2xl bg-amber-500 border border-amber-600 text-white font-bold hover:bg-amber-600 transition-all text-sm shadow-md">
                  حفظ مسودة
                </button>
              )}
              <button onClick={() => handleSave('غير مدفوعة')} className="h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all text-sm flex items-center justify-center gap-2">
                <CheckCircle className="size-4" />
                اعتماد الفاتورة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Title (Flows naturally) ────────────────────────────────── */}
      <div className="md:hidden px-4 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => router.push('/invoices')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md">
          <ArrowRight className="size-5" />
        </button>
        <div>
          <h1 className="text-xl font-black bg-gradient-to-l from-indigo-700 to-blue-600 bg-clip-text text-transparent">
            {isEdit ? `تعديل الفاتورة ${invoiceNumber}` : 'فاتورة جديدة'}
          </h1>
          <p className="text-xs font-bold text-indigo-400/80 mt-0.5">المرجع: {invoiceNumber}</p>
        </div>
      </div>

      {/* ── Mobile Bottom Action Bar (Fixed, never blocks content) ────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-mist p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex gap-3 max-w-md mx-auto">
          {!isEdit && (
            <button onClick={() => handleSave('مسودة')} className="flex-1 h-14 rounded-xl bg-amber-500 border border-amber-600 text-white font-bold hover:bg-amber-600 transition-all text-sm shadow-md">
              حفظ مسودة
            </button>
          )}
          <button onClick={() => handleSave('غير مدفوعة')} className="flex-[2] h-14 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg transition-all text-sm shadow-sm flex items-center justify-center gap-2">
            <CheckCircle className="size-5" />
            اعتماد
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-4 md:mt-0 space-y-6">
        
        {/* ── Metadata Card (z-40 so its dropdown goes over the next card) ── */}
        <div className="relative z-40 bg-white border border-white shadow-sm rounded-[2rem] p-6 sm:p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Client Section */}
            <div className="space-y-3 relative z-50">
              <label className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                العميل
              </label>
              
              {selectedClient ? (
                <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-inner">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-ink-deep text-lg block">{selectedClient.name}</span>
                      <span className="text-sm text-indigo-500 font-mono mt-0.5 block" dir="ltr">{selectedClient.phone}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedClient(null); setClientSearch('') }} className="w-10 h-10 rounded-xl bg-white text-rose-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm">
                    <X className="size-5" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={clientRef}>
                  <div className="relative">
                    <Search className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-indigo-300" />
                    <input
                      type="text"
                      placeholder="ابحث عن عميل مسجل..."
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true) }}
                      onFocus={() => setShowClientDrop(true)}
                      className="w-full bg-slate-50 border border-mist rounded-2xl py-4 ps-12 pe-4 text-base font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  {showClientDrop && (
                    <div className="absolute start-0 top-[calc(100%+8px)] w-full bg-white/95 backdrop-blur-xl border border-mist shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[9999] max-h-[300px] overflow-y-auto p-2">
                      {filteredClients.length === 0 ? (
                        <div className="p-4 text-center text-sm font-bold text-slate-500">لا يوجد عميل بهذا الاسم</div>
                      ) : (
                        filteredClients.map(c => (
                          <div key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(c.name); setShowClientDrop(false) }} className="flex items-center gap-3 p-3 hover:bg-indigo-50/50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-indigo-100">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-ink-deep">{c.name}</div>
                              <div className="text-xs font-mono text-indigo-500/80">{c.phone}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dates Section */}
            <div className="space-y-3">
              <label className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="size-4" />
                تاريخ الفاتورة
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Line Items Section (z-30 so it sits below Metadata dropdown) ── */}
        <div className="relative z-30 bg-white border border-white rounded-[2rem] p-4 md:p-8 shadow-sm">
          
          <div className="flex flex-col mb-6 border-b border-slate-100 pb-6 space-y-4">
            <h3 className="text-xl font-black text-ink-deep flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-inner flex items-center justify-center">
                <Layers className="size-5 text-white" />
              </div>
              عناصر الفاتورة
            </h3>

            {/* Quick Add Pills (Responsive wrap) */}
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <span className="text-xs font-bold text-slate-400 w-full sm:w-auto mb-1 sm:mb-0 flex items-center gap-1">
                <Sparkles className="size-3.5 text-amber-500" />
                إضافة سريعة:
              </span>
              {bundles.map(b => (
                <button key={b.id} onClick={() => quickAddItem({ id: b.id, name: b.name, type: 'bundle', bundle: b, price: b.items.reduce((s, it) => s + (it.sellingPrice ?? products.find(p => p.id === it.productId)?.price ?? 0) * it.quantity, 0) * (1 - b.discount / 100) })} className="px-4 py-2 bg-gradient-to-r from-fuchsia-100 to-purple-100 border border-purple-200 rounded-xl text-xs sm:text-sm font-bold text-purple-700 hover:shadow-md active:scale-95 transition-all text-center flex-grow sm:flex-grow-0">
                  + {b.name}
                </button>
              ))}
              {products.filter(p => p.category === 'حبر').slice(0, 3).map(p => (
                <button key={p.id} onClick={() => quickAddItem({ id: p.id, name: p.name, type: 'product', product: p, price: p.price })} className="px-4 py-2 bg-gradient-to-r from-cyan-100 to-blue-100 border border-blue-200 rounded-xl text-xs sm:text-sm font-bold text-blue-700 hover:shadow-md active:scale-95 transition-all text-center flex-grow sm:flex-grow-0">
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Table Views */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-12 gap-3 px-4 pb-3 text-xs font-black text-indigo-400 uppercase tracking-widest bg-slate-50/50 rounded-2xl py-3 mb-2">
              <div className="col-span-7">المنتج</div>
              <div className="col-span-1 text-center">الكمية</div>
              <div className="col-span-2 text-center">السعر</div>
              <div className="col-span-2 text-left">الإجمالي</div>
            </div>
            
            <div className="space-y-3">
              {lineItems.map((item) => {
                const isSearching = activeSearchRowId === item.id
                return (
                  <div key={item.id} className={`relative flex items-center gap-2 group ${isSearching ? 'z-50' : 'z-10'}`}>
                    
                    <button onClick={() => removeRow(item.id)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0">
                      <Trash2 className="size-4" />
                    </button>

                    <div className="grid grid-cols-12 gap-3 flex-1 items-start bg-white border border-slate-100 rounded-2xl p-2 hover:border-indigo-200 hover:shadow-md transition-all">
                      <div className="col-span-7 relative flex flex-col gap-2">
                        <div className="relative w-full flex items-center gap-2">
                          {item.isTemporary ? (
                            <>
                              <div className="relative flex-1 min-w-0">
                                <input type="text" value={item.productName} onChange={e => updateItem(item.id, { productName: e.target.value })} placeholder="اسم المنتج المؤقت" className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 focus:bg-white pe-12 w-full`} />
                                {!item.showDescription && (
                                  <button onClick={() => updateItem(item.id, { showDescription: true })} className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors border border-amber-300" title="إضافة وصف">
                                    + وصف
                                  </button>
                                )}
                              </div>
                              <div className="relative w-20 shrink-0">
                                <input type="number" value={item.costPrice || ''} onChange={e => updateItem(item.id, { costPrice: parseFloat(e.target.value) || 0 })} placeholder="تكلفة" className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 focus:bg-white text-center font-mono w-full px-2`} />
                              </div>
                            </>
                          ) : (
                            <>
                              <input type="text" value={item.productName} onFocus={() => { setActiveSearchRowId(item.id); setSearchQuery(item.productName); setFocusedSearchIndex(0) }} onChange={e => { setSearchQuery(e.target.value); setActiveSearchRowId(item.id) }} onKeyDown={e => handleKeyDown(e, item.id)} placeholder="البحث عن منتج..." className={`${inputClass} bg-slate-50 focus:bg-white pe-12 w-full`} />
                              {!item.showDescription && (
                                <button onClick={() => updateItem(item.id, { showDescription: true })} className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors border border-indigo-200" title="إضافة وصف">
                                  + وصف
                                </button>
                              )}
                              {isSearching && searchQuery.trim().length > 0 && (
                                <div className="absolute start-0 top-[calc(100%+8px)] w-full min-w-[300px] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[9999] max-h-[300px] overflow-y-auto p-2">
                                  {filteredItems.length === 0 ? (
                                    <div className="p-3 text-sm font-bold text-amber-600 cursor-pointer hover:bg-amber-50 rounded-xl text-center" onClick={() => handleAddTemporaryRow(item.id)}>
                                      + إضافة كمنتج مؤقت "{searchQuery}"
                                    </div>
                                  ) : (
                                    filteredItems.map((opt, oIdx) => (
                                      <div key={opt.id} onClick={() => selectAutocompleteItem(item.id, opt)} onMouseEnter={() => setFocusedSearchIndex(oIdx)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm transition-colors ${focusedSearchIndex === oIdx ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white' : 'hover:bg-slate-50'}`}>
                                        <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${focusedSearchIndex === oIdx ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                            {opt.type === 'bundle' ? <Layers className="size-4" /> : <Package className="size-4" />}
                                          </div>
                                          <span className="font-bold truncate">{opt.name}</span>
                                        </div>
                                        <span className="font-mono font-black">{formatCurrency(opt.price)}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {item.showDescription && (
                          <div className="relative mt-1">
                            <input type="text" value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="وصف إضافي..." className={`${inputClass} bg-slate-50 focus:bg-white text-xs py-2 w-full`} />
                            <button onClick={() => updateItem(item.id, { showDescription: false, description: '' })} className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors">
                              <X className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="col-span-1 h-full flex items-start pt-0.5">
                        <input type="number" min="1" value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} className={`${inputClass} bg-slate-50 focus:bg-white text-center h-[46px] w-full px-2`} />
                      </div>

                      <div className="col-span-2 h-full flex items-start pt-0.5">
                        <input type="number" min="0" value={item.unitPrice || ''} onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} className={`${inputClass} bg-slate-50 focus:bg-white text-center h-[46px] w-full px-2`} />
                      </div>

                      <div className="col-span-2 text-left h-full flex items-start pt-0.5 pe-1">
                        <span className="font-mono font-black text-[15px] xl:text-lg text-indigo-700 bg-indigo-50 px-2 xl:px-3 py-1.5 rounded-xl border border-indigo-100 inline-block w-full text-center shadow-sm h-[46px] flex items-center justify-center overflow-hidden">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Mobile/Tablet Stacked View */}
          <div className="block lg:hidden space-y-4">
            {lineItems.map((item, idx) => {
              const isSearching = activeSearchRowId === item.id
              return (
                <div key={item.id} className={`bg-white border border-slate-200 rounded-[2rem] p-4 shadow-sm relative ${isSearching ? 'z-50' : 'z-10'}`}>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">سطر {idx + 1}</span>
                    <button onClick={() => removeRow(item.id)} className="w-10 h-10 rounded-xl bg-white text-rose-500 flex items-center justify-center shadow-sm border border-rose-100 active:bg-rose-500 active:text-white transition-colors">
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="relative flex flex-col gap-3">
                      {item.isTemporary ? (
                        <div className="flex gap-2 items-start">
                          <div className="relative flex-1">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">المنتج (مؤقت)</label>
                            <input type="text" value={item.productName} onChange={e => updateItem(item.id, { productName: e.target.value })} placeholder="اسم المنتج المؤقت" className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 pe-12 w-full`} />
                            {!item.showDescription && (
                              <button onClick={() => updateItem(item.id, { showDescription: true })} className="absolute end-3 bottom-2.5 text-[10px] font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors border border-amber-300">
                                + وصف
                              </button>
                            )}
                          </div>
                          <div className="w-20 shrink-0">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">التكلفة</label>
                            <input type="number" value={item.costPrice || ''} onChange={e => updateItem(item.id, { costPrice: parseFloat(e.target.value) || 0 })} placeholder="تكلفة" className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 w-full text-center font-mono px-2`} />
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full">
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">المنتج</label>
                          <input type="text" value={item.productName} onFocus={() => { setActiveSearchRowId(item.id); setSearchQuery(item.productName); setFocusedSearchIndex(0) }} onChange={e => { setSearchQuery(e.target.value); setActiveSearchRowId(item.id) }} onKeyDown={e => handleKeyDown(e, item.id)} placeholder="البحث عن منتج..." className={`${inputClass} bg-white pe-12 w-full`} />
                          {!item.showDescription && (
                            <button onClick={() => updateItem(item.id, { showDescription: true })} className="absolute end-3 bottom-2.5 text-[10px] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors border border-indigo-200">
                              + وصف
                            </button>
                          )}
                        </div>
                      )}
                      
                      {isSearching && searchQuery.trim().length > 0 && !item.isTemporary && (
                        <div className="absolute start-0 top-[calc(100%+8px)] w-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[9999] max-h-[300px] overflow-y-auto p-2">
                          {filteredItems.length === 0 ? (
                            <div className="p-4 text-sm font-bold text-amber-600 text-center bg-amber-50 rounded-xl" onClick={() => handleAddTemporaryRow(item.id)}>
                              + منتج مؤقت "{searchQuery}"
                            </div>
                          ) : (
                            filteredItems.map((opt) => (
                              <div key={opt.id} onClick={() => selectAutocompleteItem(item.id, opt)} className="flex items-center justify-between p-3 rounded-xl border-b border-slate-50 last:border-0 hover:bg-indigo-50 active:bg-indigo-100 transition-colors">
                                <span className="font-bold text-sm text-slate-800">{opt.name}</span>
                                <span className="font-mono text-xs font-black text-indigo-600">{formatCurrency(opt.price)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {item.showDescription && (
                      <div className="relative">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">وصف إضافي</label>
                        <input type="text" value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="وصف إضافي..." className={`${inputClass} bg-white w-full`} />
                        <button onClick={() => updateItem(item.id, { showDescription: false, description: '' })} className="absolute end-3 bottom-3 text-slate-400 hover:text-rose-500 transition-colors">
                          <X className="size-4" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block text-center mb-1">الكمية</label>
                        <input type="number" min="1" value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} className="w-full text-center bg-transparent outline-none py-1 text-xl font-mono font-black text-slate-900" />
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block text-center mb-1">السعر</label>
                        <input type="number" min="0" value={item.unitPrice || ''} onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} className="w-full text-center bg-transparent outline-none py-1 text-xl font-mono font-black text-slate-900" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">الإجمالي الفرعي</span>
                      <span className="font-mono font-black text-2xl text-indigo-600 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 shadow-inner">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={addNewRow} className="flex-1 h-20 sm:h-24 px-6 sm:px-8 rounded-3xl border-2 border-dashed border-indigo-200 text-indigo-500 text-base sm:text-lg font-black hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95">
              <Plus className="size-6" />
              إضافة سطر جديد
            </button>
            <button onClick={addTemporaryRow} className="flex-1 h-20 sm:h-24 px-6 sm:px-8 rounded-3xl border-2 border-dashed border-amber-200 text-amber-600 text-base sm:text-lg font-black hover:border-amber-400 hover:bg-amber-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95">
              <Plus className="size-6" />
              إضافة منتج مؤقت
            </button>
          </div>
        </div>

        {/* ── Vibrant Summary Section (z-20) ────────────────────────────────── */}
        <div className="relative z-20 flex justify-end">
          <div className="w-full md:w-[420px] bg-gradient-to-br from-indigo-600 to-blue-700 border border-blue-500 rounded-[2rem] p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-xl" />

            <div className="space-y-5 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-blue-100">المبلغ الفرعي</span>
                <span className="font-mono font-bold text-xl text-white">{formatCurrency(subtotal)}</span>
              </div>

              <div className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur-md">
                <label className="text-xs font-black text-blue-200 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <Percent className="size-3.5" /> الخصم
                </label>
                <div className="flex gap-2">
                  <div className="relative w-24 shrink-0">
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage'|'fixed')} className="w-full bg-white/20 border border-white/30 rounded-xl h-11 px-3 appearance-none focus:border-white focus:bg-white/30 outline-none font-bold text-sm text-white cursor-pointer backdrop-blur-md">
                      <option value="percentage" className="text-slate-800">%</option>
                      <option value="fixed" className="text-slate-800">$</option>
                    </select>
                  </div>
                  <input type="number" min="0" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value)||0)} className="w-full bg-white/20 border border-white/30 rounded-xl h-11 text-center font-mono font-bold focus:border-white focus:bg-white/30 outline-none transition-all text-white placeholder-blue-200" placeholder="0" />
                </div>
                {discountAmount > 0 && (
                  <div className="mt-3 text-sm font-bold text-white bg-black/20 px-4 py-2.5 rounded-xl flex justify-between border border-white/10">
                    <span>قيمة الخصم</span>
                    <span className="font-mono font-black tracking-wider">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>

              {settings.taxEnabled && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-100">الضريبة ({settings.taxRate}%)</span>
                  <span className="font-mono font-bold text-xl text-white">{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="border-t border-white/20 pt-5 mt-6 flex justify-between items-end">
                <span className="text-xl font-black text-white">الإجمالي</span>
                <span className="font-mono font-black text-5xl text-white drop-shadow-md">{formatCurrency(total)}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
