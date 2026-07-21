'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { type InvoiceStatus, formatCurrency, type Product } from '@/lib/data'
import { toast } from 'sonner'
import { Plus, Search, X, Layers, Sparkles, Percent, Calendar, AlertTriangle, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { InvoiceStatusBar } from '@/components/invoice/invoice-status-bar'
import { LineItemRow, type LineItem, type FilteredItem } from '@/components/invoice/line-item-row'
import { QuickAddPanel } from '@/components/invoice/quick-add-panel'
import { BundleBuilderModal } from '@/components/invoice/bundle-builder-modal'
import { NotesSection } from '@/components/invoice/notes-section'
import { AssistantChat } from '@/components/assistant-chat'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-amber-200 text-amber-900 rounded-[4px] px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

const blankLineItem = (id: string): LineItem => ({ id, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false })

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

  const [lineItems, setLineItems] = useState<LineItem[]>([blankLineItem('li-initial')])
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<(typeof clients)[0] | null>(null)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState(0)
  const [notes, setNotes] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [prefilled, setPrefilled] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>('مسودة')

  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(0)

  const [showBundleModal, setShowBundleModal] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const [addedRowTypes, setAddedRowTypes] = useState({ new: false, temp: false })

  // Initialization — pre-fill from edit or recover an unsaved browser draft
  useEffect(() => {
    if (prefilled) return

    if (editingInvoice) {
      const client = clients.find(c => c.id === editingInvoice.clientId)
      if (client) { setSelectedClient(client); setClientSearch(client.name) }
      const items: LineItem[] = editingInvoice.items.map(item => ({
        id: item.id, productId: item.productId, productName: item.productName,
        description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
        total: item.total, isBundle: item.isBundle, bundleComponents: item.bundleComponents,
        isTemporary: item.isTemporary, costPrice: item.costPrice, showDescription: !!item.description
      }))
      setLineItems(items.length > 0 ? items : [blankLineItem('li-initial')])
      setDiscountType(editingInvoice.discountType)
      setDiscountValue(editingInvoice.discountValue)
      setNotes(editingInvoice.notes || '')
      setSelectedStatus(editingInvoice.status)
      setPrefilled(true)
      return
    }

    const savedDraft = localStorage.getItem('kamal-invoice-draft')
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        toast("تم العثور على مسودة سابقة", {
          description: "هل ترغب باستعادة المسودة غير المحفوظة؟",
          action: {
            label: "استعادة",
            onClick: () => {
              if (draft.selectedClient) {
                setSelectedClient(draft.selectedClient)
                setClientSearch(draft.selectedClient.name)
              }
              if (draft.lineItems) setLineItems(draft.lineItems)
              if (draft.discountType) setDiscountType(draft.discountType)
              if (draft.discountValue) setDiscountValue(draft.discountValue)
              if (draft.notes) setNotes(draft.notes)
              if (draft.invoiceDate) setInvoiceDate(draft.invoiceDate)
              toast.success("تمت استعادة المسودة بنجاح")
            }
          },
          cancel: {
            label: "حذف المسودة",
            onClick: () => localStorage.removeItem('kamal-invoice-draft')
          },
          duration: 10000
        })
      } catch (e) {
        localStorage.removeItem('kamal-invoice-draft')
      }
    }
    setPrefilled(true)
  }, [editingInvoice, clients, prefilled])

  // Auto-save Effect
  useEffect(() => {
    if (isEdit || !prefilled) return
    const hasData = selectedClient || lineItems.length > 1 || (lineItems[0] && lineItems[0].productId !== '')
    if (!hasData) return

    const timeout = setTimeout(() => {
      localStorage.setItem('kamal-invoice-draft', JSON.stringify({
        selectedClient, lineItems, discountType, discountValue, notes, invoiceDate
      }))
    }, 1500)

    return () => clearTimeout(timeout)
  }, [selectedClient, lineItems, discountType, discountValue, notes, invoiceDate, isEdit, prefilled])

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const clampedDiscount = discountType === 'percentage' ? Math.min(discountValue, 100) : Math.min(discountValue, subtotal)
  const discountAmount = discountType === 'percentage' ? subtotal * (clampedDiscount / 100) : clampedDiscount
  const taxableAmount = subtotal - discountAmount
  const taxAmount = settings.taxEnabled ? taxableAmount * (settings.taxRate / 100) : 0
  const total = taxableAmount + taxAmount

  const totalCost = lineItems.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0)
  const netProfit = taxableAmount - totalCost
  const profitMargin = taxableAmount > 0 ? (netProfit / taxableAmount) * 100 : 0
  // Fires whenever real margin drops below 5% — no longer gated on a formal discount
  // being applied, since selling at a loss via a low manual price is the same risk.
  const isMarginWarning = profitMargin < 5 && taxableAmount > 0

  const filteredItems: FilteredItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const prodList = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .map(p => ({ id: p.id, name: p.name, sellingPrice: p.sellingPrice, stock: p.stock, type: 'product' as const, product: p }))
    const bundleList = bundles.filter(b => b.name.toLowerCase().includes(q))
      .map(b => ({
        id: b.id, name: `${b.name} (حزمة)`,
        sellingPrice: b.items.reduce((s, it) => s + (it.sellingPrice ?? products.find(p => p.id === it.productId)?.sellingPrice ?? 0) * it.quantity, 0) * (1 - b.discount / 100),
        stock: Math.min(...b.items.map(it => { const p = products.find(pr => pr.id === it.productId); return p ? Math.floor(p.stock / it.quantity) : 0 })),
        type: 'bundle' as const, bundle: b
      }))
    return [...prodList, ...bundleList]
  }, [products, bundles, searchQuery])

  function addNewRow() {
    setAddedRowTypes(prev => ({ ...prev, new: true }))
    setTimeout(() => setAddedRowTypes(prev => ({ ...prev, new: false })), 1000)
    setLineItems(prev => [...prev, blankLineItem(`li-${Date.now()}`)])
  }

  function addTemporaryRow() {
    setAddedRowTypes(prev => ({ ...prev, temp: true }))
    setTimeout(() => setAddedRowTypes(prev => ({ ...prev, temp: false })), 1000)
    setLineItems(prev => [...prev, { id: `li-${Date.now()}`, productId: 'temp', productName: '', description: '', quantity: 1, unitPrice: 0, costPrice: 0, total: 0, showDescription: false, isTemporary: true }])
  }

  function removeRow(id: string) {
    setLineItems(prev => {
      const filtered = prev.filter(item => item.id !== id)
      return filtered.length > 0 ? filtered : [blankLineItem('li-initial')]
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

  function playLowStockChime() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1)
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {
      console.warn("AudioContext not supported")
    }
  }

  function quickAddItem(opt: { id: string; name: string; sellingPrice: number; type: 'product' | 'bundle', product?: Product, bundle?: any }) {
    setLineItems(prev => {
      const emptyRowIdx = prev.findIndex(r => !r.productId && !r.isTemporary && !r.productName)
      const bundleDesc = opt.type === 'bundle' ? `يحتوي على: ${(opt.bundle?.items || []).map((i: any) => { const p = products.find(pr => pr.id === i.productId); return p ? `${p.name} (x${i.quantity})` : ''; }).filter(Boolean).join('، ')}` : ''
      const desc = opt.type === 'bundle' ? bundleDesc : (opt.product?.description || '')

      const newItem: LineItem = {
        id: emptyRowIdx >= 0 ? prev[emptyRowIdx].id : `li-${Date.now()}`,
        productId: opt.id, productName: opt.name,
        description: desc,
        quantity: 1, unitPrice: opt.sellingPrice, total: opt.sellingPrice,
        isBundle: opt.type === 'bundle', bundleComponents: opt.type === 'bundle' ? opt.bundle?.items : undefined,
        isTemporary: false, costPrice: opt.type === 'product' ? opt.product?.costPrice : 0,
        showDescription: !!desc
      }
      const newItems = [...prev]
      if (emptyRowIdx >= 0) newItems[emptyRowIdx] = newItem
      else newItems.push(newItem)
      newItems.push(blankLineItem(`li-${Date.now() + 1}`))
      return newItems
    })

    if (opt.type === 'product' && opt.product && opt.product.stock < 5) {
      playLowStockChime()
      toast.warning(`تنبيه: مخزون ${opt.name} منخفض (${opt.product.stock} متبقي)`, { duration: 5000 })
    } else {
      toast.success(`تم إدراج ${opt.name}`)
    }
  }

  useBarcodeScanner(products, (product) => quickAddItem({ id: product.id, name: product.name, sellingPrice: product.sellingPrice, type: 'product', product }))

  function selectAutocompleteItem(rowId: string, opt: FilteredItem) {
    setLineItems(prev => prev.map((item, idx, arr) => {
      if (item.id !== rowId) return item
      if (idx === arr.length - 1) setTimeout(addNewRow, 10)

      const bundleDesc = opt.type === 'bundle' ? `يحتوي على: ${((opt.bundle as any)?.items || []).map((i: any) => { const p = products.find(pr => pr.id === i.productId); return p ? `${p.name} (x${i.quantity})` : ''; }).filter(Boolean).join('، ')}` : ''
      const desc = opt.type === 'bundle' ? bundleDesc : ((opt.product as Product | undefined)?.description || '')

      return {
        id: item.id, productId: opt.id, productName: opt.name,
        description: desc,
        quantity: item.quantity, unitPrice: opt.sellingPrice, total: item.quantity * opt.sellingPrice,
        isBundle: opt.type === 'bundle', bundleComponents: opt.type === 'bundle' ? (opt.bundle as any)?.items : undefined,
        isTemporary: false, costPrice: opt.type === 'product' ? (opt.product as Product | undefined)?.costPrice : 0,
        showDescription: !!desc
      }
    }))
    setActiveSearchRowId(null); setSearchQuery(''); setFocusedSearchIndex(0)
    setTimeout(() => document.getElementById(`qty-${rowId}`)?.focus(), 50)

    if (opt.type === 'product' && opt.product && (opt.product as Product).stock < 5) {
      playLowStockChime()
      toast.warning(`تنبيه: مخزون ${opt.name} منخفض (${(opt.product as Product).stock} متبقي)`, { duration: 5000 })
    }
  }

  function handleAddCustomBundle(name: string, price: number, items: { productId: string; productName: string; quantity: number }[]) {
    const desc = `يحتوي على: ${items.map(i => `${i.productName} (x${i.quantity})`).join('، ')}`

    setLineItems(prev => {
      const emptyRowIdx = prev.findIndex(r => !r.productId && !r.isTemporary && !r.productName)
      const newItem: LineItem = {
        id: emptyRowIdx >= 0 ? prev[emptyRowIdx].id : `li-${Date.now()}`,
        productId: `custom-bundle-${Date.now()}`,
        productName: name,
        description: desc,
        quantity: 1,
        unitPrice: price,
        total: price,
        isBundle: true,
        bundleComponents: items,
        isTemporary: false,
        costPrice: 0,
        showDescription: true
      }
      const newItems = [...prev]
      if (emptyRowIdx >= 0) newItems[emptyRowIdx] = newItem
      else newItems.push(newItem)
      newItems.push(blankLineItem(`li-${Date.now() + 1}`))
      return newItems
    })

    setShowBundleModal(false)
    toast.success('تم إدراج الحزمة المخصصة بنجاح')
  }

  function handleAddTemporaryRow(rowId: string) {
    setLineItems(prev => prev.map((item, idx, arr) => {
      if (item.id !== rowId) return item
      if (idx === arr.length - 1) setTimeout(addNewRow, 10)
      return { ...item, productId: '', productName: searchQuery || 'منتج مؤقت', isTemporary: true, unitPrice: 0, costPrice: 0, total: 0 }
    }))
    setActiveSearchRowId(null); setSearchQuery('')
    setTimeout(() => document.getElementById(`qty-${rowId}`)?.focus(), 50)
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
      else document.getElementById(`qty-${rowId}`)?.focus()
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
      localStorage.removeItem('kamal-invoice-draft')
      router.push(`/invoices/${editId}`)
    } else {
      addInvoice(invoiceData)
      toast.success('تم إنشاء الفاتورة بنجاح')
      localStorage.removeItem('kamal-invoice-draft')
      router.push('/invoices')
    }
  }

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    return q ? clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)) : clients
  }, [clients, clientSearch])

  if (connectionStatus === 'loading') return <div className="p-8 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>

  const inputClass = "w-full bg-white border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none py-3.5 px-4 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm"

  function focusNextAfterQty(rowId: string) {
    document.getElementById(`price-${rowId}`)?.focus()
  }

  function focusNextAfterPrice(rowId: string) {
    const idx = lineItems.findIndex(li => li.id === rowId)
    if (idx === lineItems.length - 1) {
      addNewRow()
      setTimeout(() => {
        const inputs = document.querySelectorAll('.prod-input')
        if (inputs.length) (inputs[inputs.length - 1] as HTMLElement).focus()
      }, 50)
    } else {
      document.getElementById(`prod-${lineItems[idx + 1].id}`)?.focus()
    }
  }

  return (
    <div className="pb-16 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">

      <div className="max-w-6xl mx-auto px-2 sm:px-4">
        <InvoiceStatusBar
          invoiceNumber={invoiceNumber || ''}
          isEdit={isEdit}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          onBack={() => router.push('/invoices')}
          onSave={() => handleSave(selectedStatus)}
        />
      </div>

      <div className="max-w-6xl mx-auto px-2 sm:px-4 mt-4 space-y-4 sm:space-y-6">

        {/* ── Metadata Card ── */}
        <div className="relative z-40 bg-white border border-white shadow-sm rounded-[2rem] p-4 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-3 relative z-50">
              <label className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                العميل
              </label>

              {selectedClient ? (
                <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-inner">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-ink-deep text-lg block truncate">{selectedClient.name}</span>
                      <span className="text-sm text-indigo-500 font-mono mt-0.5 block" dir="ltr">{selectedClient.phone}</span>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedClient(null); setClientSearch('') }} className="w-11 h-11 shrink-0 rounded-xl bg-white text-rose-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm active:scale-95">
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
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => { setSelectedClient(c); setClientSearch(c.name); setShowClientDrop(false) }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50/50 rounded-xl transition-colors border border-transparent hover:border-indigo-100 text-start"
                          >
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                              {c.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-ink-deep truncate">
                                <HighlightMatch text={c.name} query={clientSearch} />
                              </div>
                              <div className="text-xs font-mono text-indigo-500/80">{c.phone}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

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

        {/* ── AI Assistant (optional, inline, no popup) ── */}
        <div className="relative z-35 bg-white border border-white rounded-[2rem] p-4 sm:p-6 shadow-sm">
          <button
            onClick={() => setAssistantOpen(v => !v)}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 font-bold text-sm transition-all ${assistantOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-4" />
              اطلب من المساعد الذكي إنشاء الفاتورة بلغة طبيعية
            </span>
            {assistantOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          </button>
          <AnimatePresence initial={false}>
            {assistantOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                <div className="pt-4">
                  <AssistantChat compact height="480px" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Line Items Section ── */}
        <div className="relative z-30 bg-white border border-white rounded-[2rem] p-4 sm:p-8 shadow-sm">

          <div className="flex flex-col mb-6 border-b border-slate-100 pb-6 space-y-4">
            <h3 className="text-xl font-black text-ink-deep flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-inner flex items-center justify-center">
                <Layers className="size-5 text-white" />
              </div>
              عناصر الفاتورة
            </h3>

            <div className="relative mb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner shadow-white/20">
                  <Sparkles className="size-4 text-white" />
                </div>
                <span className="text-sm font-black text-slate-800 tracking-wide">إضافة سريعة</span>
              </div>
              <QuickAddPanel bundles={bundles} products={products} onAdd={(bundle, price) => quickAddItem({ id: bundle.id, name: bundle.name, type: 'bundle', bundle, sellingPrice: price })} />
            </div>
          </div>

          {/* Column labels — desktop only */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 pb-3 text-xs font-black text-indigo-400 uppercase tracking-widest bg-slate-50/50 rounded-2xl py-3 mb-2">
            <div className="col-span-7">المنتج</div>
            <div className="col-span-1 text-center">الكمية</div>
            <div className="col-span-2 text-center">السعر</div>
            <div className="col-span-2 text-left">الإجمالي</div>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {lineItems.map((item, idx) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  inputClass={inputClass}
                  isSearching={activeSearchRowId === item.id}
                  searchQuery={searchQuery}
                  filteredItems={filteredItems}
                  focusedSearchIndex={focusedSearchIndex}
                  onHoverSearchIndex={setFocusedSearchIndex}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                  onRemove={() => removeRow(item.id)}
                  onFocusSearch={() => { setActiveSearchRowId(item.id); setSearchQuery(item.productName); setFocusedSearchIndex(0) }}
                  onSearchChange={(value) => { setSearchQuery(value); setActiveSearchRowId(item.id) }}
                  onKeyDownSearch={(e) => handleKeyDown(e, item.id)}
                  onSelectAutocomplete={(opt) => selectAutocompleteItem(item.id, opt)}
                  onAddTemporary={() => handleAddTemporaryRow(item.id)}
                  onQuantityEnter={() => focusNextAfterQty(item.id)}
                  onPriceEnter={() => focusNextAfterPrice(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button onClick={addNewRow} className="h-14 lg:h-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white font-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
              {addedRowTypes.new ? <Check className="size-5 text-emerald-500 animate-in zoom-in" /> : <Plus className="size-5" />}
              إضافة منتج جديد
            </button>
            <button onClick={addTemporaryRow} className="h-14 lg:h-16 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 border border-white/20">
              {addedRowTypes.temp ? <Check className="size-5 text-emerald-200 animate-in zoom-in" /> : <Plus className="size-5" />}
              منتج غير مسجل
            </button>
            <button onClick={() => setShowBundleModal(v => !v)} className="h-14 lg:h-16 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 border border-white/20">
              {showBundleModal ? <X className="size-5" /> : <Layers className="size-5" />}
              حزمة مخصصة
            </button>
          </div>

          <BundleBuilderModal open={showBundleModal} onClose={() => setShowBundleModal(false)} products={products} onConfirm={handleAddCustomBundle} />
        </div>

        {/* ── Notes ── */}
        <NotesSection notes={notes} onChange={setNotes} />

        {/* ── Summary ── */}
        <div className="relative z-20 flex flex-col md:flex-row justify-end gap-6">
          <div className="w-full md:w-[420px] shrink-0 bg-gradient-to-br from-indigo-600 to-blue-700 border border-blue-500 rounded-[2rem] p-4 sm:p-8 shadow-xl text-white relative overflow-hidden">

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
                    <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')} className="w-full bg-white/20 border border-white/30 rounded-xl h-12 px-3 appearance-none focus:border-white focus:bg-white/30 outline-none font-bold text-sm text-white cursor-pointer backdrop-blur-md">
                      <option value="percentage" className="text-slate-800">%</option>
                      <option value="fixed" className="text-slate-800">$</option>
                    </select>
                  </div>
                  <input type="number" inputMode="decimal" min="0" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} className="w-full bg-white/20 border border-white/30 rounded-xl h-12 text-center font-mono font-bold focus:border-white focus:bg-white/30 outline-none transition-all text-white placeholder-blue-200" placeholder="0" />
                </div>
                {discountAmount > 0 && (
                  <div className="mt-3 text-sm font-bold text-white bg-black/20 px-4 py-2.5 rounded-xl flex justify-between border border-white/10">
                    <span>قيمة الخصم</span>
                    <span className="font-mono font-black tracking-wider">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {isMarginWarning && (
                  <div className="mt-3 text-xs font-black text-rose-200 bg-rose-500/20 px-3 py-2 rounded-xl flex items-center gap-2 border border-rose-500/30 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                    <AlertTriangle className="size-4 shrink-0 text-rose-300" />
                    تحذير: هامش الربح منخفض جداً! ({profitMargin.toFixed(1)}%)
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
                <span className="font-mono font-black text-4xl sm:text-5xl text-white drop-shadow-md">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
