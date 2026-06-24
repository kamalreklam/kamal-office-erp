'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { type InvoiceStatus, formatCurrency, type Product } from '@/lib/data'
import { toast } from 'sonner'
import { Plus, Trash2, Search, X, ArrowRight, CheckCircle, Package, Layers, Sparkles, Percent, Calendar, Mic, AlignLeft, AlertTriangle, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [showBundlePicker, setShowBundlePicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(0)

  // Bundle Builder State
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [customBundleName, setCustomBundleName] = useState('')
  const [customBundlePrice, setCustomBundlePrice] = useState<number | ''>('')
  const [customBundleItems, setCustomBundleItems] = useState<{productId: string; productName: string; quantity: number}[]>([])
  const [bundleSearchQuery, setBundleSearchQuery] = useState('')

  // Voice Dictation State
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Subtle Checkmark State
  const [addedRowTypes, setAddedRowTypes] = useState({ new: false, temp: false })

  function toggleDictation() {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      toast.info('تم إيقاف الإملاء الصوتي')
      return
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('متصفحك لا يدعم خاصية الإملاء الصوتي')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ar-SA'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' '
        }
      }
      if (finalTranscript) {
        setNotes(prev => prev + (prev ? ' ' : '') + finalTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      if (event.error !== 'no-speech') {
        toast.error('حدث خطأ أثناء الإملاء الصوتي')
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      toast.success('تحدث الآن باللغة العربية...')
    } catch (e) {
      console.error(e)
      toast.error('تعذر تشغيل الميكروفون')
    }
  }

  // Initialization
  // Pre-fill from edit or draft
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
      setLineItems(items.length > 0 ? items : [{ id: 'li-initial', productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false }])
      setDiscountType(editingInvoice.discountType)
      setDiscountValue(editingInvoice.discountValue)
      setNotes(editingInvoice.notes || '')
      setPrefilled(true)
      return
    }

    // Auto-save draft recovery
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

  // Auto-Save Effect
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
  const isMarginWarning = profitMargin < 5 && taxableAmount > 0 && discountAmount > 0

  const filteredItems = useMemo(() => {
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
    setLineItems(prev => [...prev, { id: `li-${Date.now()}`, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false }])
  }

  function addTemporaryRow() {
    setAddedRowTypes(prev => ({ ...prev, temp: true }))
    setTimeout(() => setAddedRowTypes(prev => ({ ...prev, temp: false })), 1000)
    setLineItems(prev => [...prev, { id: `li-${Date.now()}`, productId: 'temp', productName: '', description: '', quantity: 1, unitPrice: 0, costPrice: 0, total: 0, showDescription: false, isTemporary: true }])
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
    } catch(e) {
      console.warn("AudioContext not supported")
    }
  }

  function quickAddItem(opt: { id: string; name: string; sellingPrice: number; type: 'product' | 'bundle', product?: Product, bundle?: any }) {
    setLineItems(prev => {
      const emptyRowIdx = prev.findIndex(r => !r.productId && !r.isTemporary && !r.productName)
      const bundleDesc = opt.type === 'bundle' ? `يحتوي على: ${(opt.bundle?.items || []).map((i:any) => { const p = products.find(pr=>pr.id===i.productId); return p?`${p.name} (x${i.quantity})`:''; }).filter(Boolean).join('، ')}` : ''
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
      newItems.push({ id: `li-${Date.now() + 1}`, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false })
      return newItems
    })
    
    if (opt.type === 'product' && opt.product && opt.product.stock < 5) {
      playLowStockChime()
      toast.warning(`تنبيه: مخزون ${opt.name} منخفض (${opt.product.stock} متبقي)`, { duration: 5000 })
    } else {
      toast.success(`تم إدراج ${opt.name}`)
    }
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
        quantity: item.quantity, unitPrice: opt.sellingPrice, total: item.quantity * opt.sellingPrice,
        isBundle: opt.type === 'bundle', bundleComponents: opt.type === 'bundle' ? opt.bundle?.items : undefined,
        isTemporary: false, costPrice: opt.type === 'product' ? opt.product?.costPrice : 0,
        showDescription: !!desc
      }
    }))
    setActiveSearchRowId(null); setSearchQuery(''); setFocusedSearchIndex(0)
    setTimeout(() => document.getElementById(`qty-${rowId}`)?.focus(), 50)
    
    if (opt.type === 'product' && opt.product && opt.product.stock < 5) {
      playLowStockChime()
      toast.warning(`تنبيه: مخزون ${opt.name} منخفض (${opt.product.stock} متبقي)`, { duration: 5000 })
    }
  }

  function handleAddCustomBundle() {
    if (!customBundleName || !customBundlePrice || customBundleItems.length === 0) {
      toast.error('الرجاء إدخال اسم الحزمة، السعر، وإضافة منتج واحد على الأقل')
      return
    }

    const desc = `يحتوي على: ${customBundleItems.map(i => `${i.productName} (x${i.quantity})`).join('، ')}`

    setLineItems(prev => {
      const emptyRowIdx = prev.findIndex(r => !r.productId && !r.isTemporary && !r.productName)
      const newItem: LineItem = {
        id: emptyRowIdx >= 0 ? prev[emptyRowIdx].id : `li-${Date.now()}`,
        productId: `custom-bundle-${Date.now()}`,
        productName: customBundleName,
        description: desc,
        quantity: 1,
        unitPrice: Number(customBundlePrice),
        total: Number(customBundlePrice),
        isBundle: true,
        bundleComponents: customBundleItems,
        isTemporary: false,
        costPrice: 0,
        showDescription: true
      }
      const newItems = [...prev]
      if (emptyRowIdx >= 0) newItems[emptyRowIdx] = newItem
      else newItems.push(newItem)
      newItems.push({ id: `li-${Date.now() + 1}`, productId: '', productName: '', description: '', quantity: 1, unitPrice: 0, total: 0, showDescription: false })
      return newItems
    })

    setShowBundleModal(false)
    setCustomBundleName('')
    setCustomBundlePrice('')
    setCustomBundleItems([])
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

  const latestProductsRef = useRef(products)
  useEffect(() => { latestProductsRef.current = products }, [products])
  
  const latestQuickAddRef = useRef(quickAddItem)
  useEffect(() => { latestQuickAddRef.current = quickAddItem }, [quickAddItem])

  // Barcode Scanner Listener
  useEffect(() => {
    let barcodeBuffer = ''
    let lastKeyTime = 0

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
      
      const now = Date.now()
      // If time between keystrokes > 50ms, it's not a scanner
      if (now - lastKeyTime > 50) barcodeBuffer = ''
      lastKeyTime = now

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          e.preventDefault()
          const product = latestProductsRef.current.find(p => p.sku === barcodeBuffer)
          if (product) {
            latestQuickAddRef.current({ id: product.id, name: product.name, sellingPrice: product.sellingPrice, type: 'product', product })
          } else {
            toast.error(`الباركود غير مسجل: ${barcodeBuffer}`)
          }
          barcodeBuffer = ''
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeBuffer += e.key
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
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

      <div className="max-w-6xl mx-auto px-2 sm:px-4 mt-4 md:mt-0 space-y-4 sm:space-y-6">
        
        {/* ── Metadata Card (z-40 so its dropdown goes over the next card) ── */}
        <div className="relative z-40 bg-white border border-white shadow-sm rounded-[2rem] p-4 sm:p-8">
          
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
                              <div className="font-bold text-ink-deep">
                                <HighlightMatch text={c.name} query={clientSearch} />
                              </div>
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
        <div className="relative z-30 bg-white border border-white rounded-[2rem] p-4 sm:p-8 shadow-sm">
          
          <div className="flex flex-col mb-6 border-b border-slate-100 pb-6 space-y-4">
            <h3 className="text-xl font-black text-ink-deep flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-inner flex items-center justify-center">
                <Layers className="size-5 text-white" />
              </div>
              عناصر الفاتورة
            </h3>

            {/* Quick Add Section */}
            <div className="relative mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner shadow-white/20">
                  <Sparkles className="size-4 text-white" />
                </div>
                <span className="text-sm font-black text-slate-800 tracking-wide">إضافة سريعة</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  onClick={() => setShowBundlePicker(v => !v)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[15px] font-bold active:scale-95 transition-all ${showBundlePicker ? 'bg-indigo-600 text-white shadow-md' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm hover:shadow-md hover:shadow-indigo-500/30'}`}
                >
                  <Layers className="size-4" />
                  الباقات
                  <span className="bg-white/20 text-[13px] font-black px-1.5 py-0.5 rounded-full">{bundles.length}</span>
                </button>

                {products.filter(p => p.category === 'حبر').map((p, idx) => {
                  const colors = [
                    'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
                    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100',
                    'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
                    'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
                    'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
                    'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  ]
                  const c = colors[idx % colors.length]
                  const outOfStock = p.stock <= 0
                  return (
                    <button
                      key={p.id}
                      disabled={outOfStock}
                      onClick={() => quickAddItem({ id: p.id, name: p.name, type: 'product', product: p, sellingPrice: p.sellingPrice })}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-2xl text-[15px] font-bold active:scale-95 transition-all ${c} ${outOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <Plus className="size-4 opacity-60" />
                      {p.name}
                      <span className="text-[12px] opacity-50">({p.stock})</span>
                    </button>
                  )
                })}
              </div>

              {/* Inline bundle grid — expands in place */}
              <AnimatePresence>
                {showBundlePicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                      {bundles.map(b => {
                        const bundlePrice = b.items.reduce((s, it) => {
                          const price = it.sellingPrice ?? products.find(p => p.id === it.productId)?.sellingPrice ?? 0
                          return s + price * it.quantity
                        }, 0) * (1 - b.discount / 100)
                        const availableUnits = b.items.length === 0 ? 0 : Math.min(
                          ...b.items.map(it => {
                            const prod = products.find(p => p.id === it.productId)
                            return prod ? Math.floor(prod.stock / it.quantity) : 0
                          })
                        )
                        const inStock = availableUnits > 0
                        return (
                          <button
                            key={b.id}
                            disabled={!inStock}
                            onClick={() => { quickAddItem({ id: b.id, name: b.name, type: 'bundle', bundle: b, sellingPrice: bundlePrice }); setShowBundlePicker(false) }}
                            className={`group flex flex-col gap-1.5 p-3 rounded-2xl border text-right transition-all active:scale-95 ${
                              inStock ? 'bg-white border-indigo-100 hover:border-indigo-400 hover:shadow-md cursor-pointer' : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[15px] font-black text-slate-800 leading-snug">{b.name}</span>
                              <span className={`shrink-0 text-[13px] font-bold px-2 py-0.5 rounded-full ${
                                availableUnits > 3 ? 'bg-emerald-50 text-emerald-700'
                                : availableUnits > 0 ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-600'
                              }`}>{inStock ? availableUnits : '✕'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[16px] font-black text-indigo-600">{formatCurrency(bundlePrice)}</span>
                              <span className={`text-[13px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                                inStock ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-100 text-slate-400'
                              }`}>+ إضافة</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
              <AnimatePresence mode="popLayout">
              {lineItems.map((item) => {
                const isSearching = activeSearchRowId === item.id
                return (
                  <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} key={item.id} className={`relative flex items-center gap-2 group ${isSearching ? 'z-50' : 'z-10'}`}>
                    
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
                              <div className="relative w-24 shrink-0">
                                <input type="number" value={item.costPrice || ''} onChange={e => updateItem(item.id, { costPrice: parseFloat(e.target.value) || 0 })} placeholder="تكلفة" className={`${inputClass} force-english-digits bg-amber-50 border-amber-200 focus:border-amber-500 focus:bg-white text-center w-full px-2`} />
                              </div>
                            </>
                          ) : (
                            <>
                              <input type="text" id={`prod-${item.id}`} value={item.productName} onFocus={() => { setActiveSearchRowId(item.id); setSearchQuery(item.productName); setFocusedSearchIndex(0) }} onChange={e => { updateItem(item.id, { productName: e.target.value }); setSearchQuery(e.target.value); setActiveSearchRowId(item.id) }} onKeyDown={e => handleKeyDown(e, item.id)} placeholder="البحث عن منتج..." className={`${inputClass} prod-input bg-slate-50 focus:bg-white pe-12 w-full`} />
                              {!item.showDescription && (
                                <button onClick={() => updateItem(item.id, { showDescription: true })} className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors border border-indigo-200" title="إضافة وصف">
                                  + وصف
                                </button>
                              )}
                              {isSearching && searchQuery.trim().length > 0 && (
                                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute start-0 top-[calc(100%+8px)] w-full min-w-[350px] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[9999] max-h-[350px] overflow-y-auto p-2">
                                  {filteredItems.length === 0 ? (
                                    <div className="p-3 text-sm font-bold text-amber-600 cursor-pointer hover:bg-amber-50 rounded-xl text-center" onClick={() => handleAddTemporaryRow(item.id)}>
                                      + إضافة كمنتج مؤقت "{searchQuery}"
                                    </div>
                                  ) : (
                                    filteredItems.map((opt, oIdx) => (
                                      <div key={opt.id} onClick={() => selectAutocompleteItem(item.id, opt)} onMouseEnter={() => setFocusedSearchIndex(oIdx)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm transition-colors mb-1 ${focusedSearchIndex === oIdx ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'}`}>
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${focusedSearchIndex === oIdx ? 'bg-white/20' : 'bg-indigo-50 text-indigo-500'}`}>
                                            {opt.type === 'bundle' ? <Layers className="size-5" /> : <Package className="size-5" />}
                                          </div>
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <span className="font-bold truncate text-[13px]">
                                              <HighlightMatch text={opt.name} query={searchQuery} />
                                            </span>
                                            {opt.type === 'bundle' && (
                                              <span className={`text-[10px] truncate ${focusedSearchIndex === oIdx ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                حزمة تحتوي على عدة منتجات
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <span className={`font-mono font-black text-sm ms-2 shrink-0 ${focusedSearchIndex === oIdx ? 'text-white' : 'text-indigo-600'}`}>
                                          {formatCurrency(opt.sellingPrice)}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </motion.div>
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
                        <input type="number" id={`qty-${item.id}`} min="1" value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`price-${item.id}`)?.focus() } }} className={`${inputClass} force-english-digits bg-slate-50 focus:bg-white text-center h-[46px] w-full px-2`} />
                      </div>

                      <div className="col-span-2 h-full flex items-start pt-0.5">
                        <div className="w-full relative group">
                          <input type="number" id={`price-${item.id}`} min="0" value={item.unitPrice || ''} onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const idx = lineItems.findIndex(li => li.id === item.id);
                              if (idx === lineItems.length - 1) {
                                addNewRow();
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll('.prod-input');
                                  if (inputs.length) (inputs[inputs.length - 1] as HTMLElement).focus();
                                }, 50);
                              } else {
                                document.getElementById(`prod-${lineItems[idx + 1].id}`)?.focus();
                              }
                            }
                          }} className={`${inputClass} force-english-digits bg-slate-50 focus:bg-white text-center h-[46px] w-full px-2`} />
                          
                          {/* Admin-only profit margin tooltip */}
                          {!item.isTemporary && item.productId && (
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 flex items-center gap-1.5 whitespace-nowrap bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg shadow-lg">
                              <span className="font-mono">{formatCurrency(item.costPrice || 0)} تكلفة</span>
                              <span className="text-slate-400">|</span>
                              <span className={`font-mono font-bold ${item.unitPrice > 0 && ((item.unitPrice - (item.costPrice || 0)) / item.unitPrice) * 100 < 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {item.unitPrice > 0 ? Math.round(((item.unitPrice - (item.costPrice || 0)) / item.unitPrice) * 100) : 0}% ربح
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-span-2 text-left h-full flex items-start pt-0.5 pe-1">
                        <span className="font-mono font-black text-[15px] xl:text-lg text-indigo-700 bg-indigo-50 px-2 xl:px-3 py-1.5 rounded-xl border border-indigo-100 inline-block w-full text-center shadow-sm h-[46px] flex items-center justify-center overflow-hidden">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile/Tablet Stacked View */}
          <div className="block lg:hidden space-y-4">
            <AnimatePresence mode="popLayout">
            {lineItems.map((item, idx) => {
              const isSearching = activeSearchRowId === item.id
              return (
                <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} key={item.id} className={`bg-white border border-indigo-100/60 rounded-[2rem] p-4 shadow-lg shadow-indigo-900/5 relative ${isSearching ? 'z-50' : 'z-10'}`}>
                  
                  {/* Card Header Strip */}
                  <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-blue-500 rounded-l-[2rem]" />

                  <div className="flex justify-between items-center mb-5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">{idx + 1}</span>
                      <span className="text-sm font-bold text-slate-800">تفاصيل العنصر</span>
                    </div>
                    <button onClick={() => removeRow(item.id)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="space-y-4 pl-2">
                    <div className="relative flex flex-col gap-3">
                      {item.isTemporary ? (
                        <div className="flex flex-col gap-3">
                          <div className="relative w-full">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">المنتج (مؤقت)</label>
                            <input type="text" value={item.productName} onChange={e => updateItem(item.id, { productName: e.target.value })} placeholder="اسم المنتج المؤقت" className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 pe-12 w-full`} />
                            {!item.showDescription && (
                              <button onClick={() => updateItem(item.id, { showDescription: true })} className="absolute end-3 bottom-3 text-[10px] font-bold text-amber-600 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors border border-amber-300">
                                + وصف
                              </button>
                            )}
                          </div>
                          <div className="w-full">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">التكلفة الأساسية</label>
                            <input type="number" value={item.costPrice || ''} onChange={e => updateItem(item.id, { costPrice: parseFloat(e.target.value) || 0 })} placeholder="تكلفة" className={`${inputClass} bg-amber-50 border-amber-200 focus:border-amber-500 w-full font-mono px-4`} />
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">المنتج</label>
                          <input type="text" id={`prod-${item.id}`} value={item.productName} onFocus={() => { setActiveSearchRowId(item.id); setSearchQuery(item.productName); setFocusedSearchIndex(0) }} onChange={e => { updateItem(item.id, { productName: e.target.value }); setSearchQuery(e.target.value); setActiveSearchRowId(item.id) }} onKeyDown={e => handleKeyDown(e, item.id)} placeholder="البحث عن منتج مسجل..." className={`${inputClass} prod-input bg-slate-50 border border-slate-200 pe-12 w-full`} />
                          {!item.showDescription && (
                            <button onClick={() => updateItem(item.id, { showDescription: true })} className="absolute end-3 bottom-3 text-[10px] font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors border border-indigo-200">
                              + وصف
                            </button>
                          )}
                        </div>
                      )}
                      
                      {isSearching && searchQuery.trim().length > 0 && !item.isTemporary && (
                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute start-0 top-[calc(100%+8px)] w-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl z-[9999] max-h-[350px] overflow-y-auto p-2">
                          {filteredItems.length === 0 ? (
                            <div className="p-4 text-sm font-bold text-amber-600 text-center bg-amber-50 rounded-xl" onClick={() => handleAddTemporaryRow(item.id)}>
                              + تسجيل كمنتج مؤقت "{searchQuery}"
                            </div>
                          ) : (
                            filteredItems.map((opt, oIdx) => (
                              <div key={opt.id} onClick={() => selectAutocompleteItem(item.id, opt)} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm transition-colors mb-1 ${focusedSearchIndex === oIdx ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md' : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'}`}>
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${focusedSearchIndex === oIdx ? 'bg-white/20' : 'bg-indigo-50 text-indigo-500'}`}>
                                    {opt.type === 'bundle' ? <Layers className="size-5" /> : <Package className="size-5" />}
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="font-bold truncate text-[13px]">{opt.name}</span>
                                    {opt.type === 'bundle' && (
                                      <span className={`text-[10px] truncate ${focusedSearchIndex === oIdx ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        حزمة تحتوي على منتجات
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={`font-mono font-black text-sm ms-2 shrink-0 ${focusedSearchIndex === oIdx ? 'text-white' : 'text-indigo-600'}`}>
                                  {formatCurrency(opt.sellingPrice)}
                                </span>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </div>

                    {item.showDescription && (
                      <div className="relative">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">وصف إضافي</label>
                        <input type="text" value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} placeholder="اكتب تفاصيل إضافية للطباعة..." className={`${inputClass} bg-slate-50 w-full`} />
                        <button onClick={() => updateItem(item.id, { showDescription: false, description: '' })} className="absolute end-3 bottom-3 text-slate-400 hover:text-rose-500 transition-colors">
                          <X className="size-5" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="relative">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">الكمية</label>
                        <input type="number" id={`qty-${item.id}`} min="1" value={item.quantity || ''} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`price-${item.id}`)?.focus() } }} className={`${inputClass} text-center font-mono font-black text-xl text-slate-900 force-english-digits`} />
                      </div>
                      <div className="relative">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">السعر للوحدة</label>
                        <input type="number" id={`price-${item.id}`} min="0" value={item.unitPrice || ''} onChange={e => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const idx = lineItems.findIndex(li => li.id === item.id);
                            if (idx === lineItems.length - 1) {
                              addNewRow();
                              setTimeout(() => {
                                const inputs = document.querySelectorAll('.prod-input');
                                if (inputs.length) (inputs[inputs.length - 1] as HTMLElement).focus();
                              }, 50);
                            } else {
                              document.getElementById(`prod-${lineItems[idx + 1].id}`)?.focus();
                            }
                          }
                        }} className={`${inputClass} text-center font-mono font-black text-xl text-slate-900 force-english-digits`} />
                      </div>
                    </div>

                    <div className="pt-5 mt-2 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-400">الإجمالي الفرعي</span>
                      <span className="font-mono font-black text-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 rounded-xl shadow-md shadow-indigo-500/20">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:hidden">
            <button onClick={addNewRow} className="w-full h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white font-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
              {addedRowTypes.new ? <Check className="size-5 text-emerald-500 animate-in zoom-in" /> : <Plus className="size-5" />}
              إضافة منتج جديد
            </button>
            <button onClick={addTemporaryRow} className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black hover:shadow-lg hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 border border-white/20">
              {addedRowTypes.temp ? <Check className="size-5 text-emerald-200 animate-in zoom-in" /> : <Plus className="size-5" />}
              إضافة منتج غير مسجل
            </button>
            <button onClick={() => setShowBundleModal(true)} className="w-full h-14 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black hover:shadow-lg hover:shadow-fuchsia-500/30 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 border border-white/20">
              <Layers className="size-5" />
              تكوين حزمة عروض
            </button>
          </div>
          
          <div className="mt-6 hidden lg:flex flex-row gap-3">
            <button onClick={addNewRow} className="flex-1 h-20 px-8 rounded-3xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white text-lg font-black transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95">
              {addedRowTypes.new ? <Check className="size-6 text-emerald-500 animate-in zoom-in" /> : <Plus className="size-6" />}
              إضافة منتج جديد
            </button>
            <button onClick={addTemporaryRow} className="flex-1 h-20 px-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 text-base font-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 border border-white/20">
              {addedRowTypes.temp ? <Check className="size-5 text-emerald-200 animate-in zoom-in" /> : <Plus className="size-5" />}
              إضافة منتج مؤقت
            </button>
            <button onClick={() => setShowBundleModal(true)} className="flex-1 h-20 px-4 rounded-3xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:shadow-lg hover:shadow-fuchsia-500/30 text-base font-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 border border-white/20">
              <Layers className="size-5" />
              تكوين حزمة عروض
            </button>
          </div>
        </div>

        {/* ── Bottom Section: Summary ────────────────────────────────── */}
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
                {isMarginWarning && (
                  <div className="mt-3 text-[11px] font-black text-rose-200 bg-rose-500/20 px-3 py-2 rounded-xl flex items-center gap-2 border border-rose-500/30 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                    <AlertTriangle className="size-4 shrink-0 text-rose-300" />
                    تحذير: هامش الربح انخفض عن 5% بسبب الخصم! ({profitMargin.toFixed(1)}%)
                  </div>
                )}
              </div>

              {settings.taxEnabled && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-100">الضريبة ({settings.taxRate}%)</span>
                  <span className="font-mono font-bold text-xl text-white">{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="border-t border-white/20 pt-5 mt-6 flex justify-between items-end relative group">
                <span className="text-xl font-black text-white">الإجمالي</span>
                <span className="font-mono font-black text-5xl text-white drop-shadow-md cursor-help">{formatCurrency(total)}</span>
                
                {/* Live Currency Tooltip */}
                <div className="absolute top-0 right-0 -translate-y-[110%] opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none bg-white/95 backdrop-blur-xl text-slate-800 text-sm font-black px-4 py-2 rounded-2xl shadow-xl border border-white/40 flex flex-col gap-1 items-end min-w-[140px]">
                  <div className="flex justify-between w-full">
                    <span className="text-emerald-600 font-mono">{(total * 0.000067).toFixed(2)}$</span>
                    <span className="text-slate-400 font-bold text-xs">USD</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span className="text-blue-600 font-mono">{(total * 0.000062).toFixed(2)}€</span>
                    <span className="text-slate-400 font-bold text-xs">EUR</span>
                  </div>
                  <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white/95 border-b border-l border-white/40 rotate-[-45deg]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Confirmation Bar ──────────────────────────────────── */}
        <div className="relative z-20 flex flex-col sm:flex-row gap-3 mt-2">
          <button
            onClick={() => handleSave('مدفوعة جزئياً')}
            className="flex-1 h-16 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-base hover:shadow-lg hover:shadow-amber-500/30 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Percent className="size-5" />
            دفع جزئي
          </button>
          <button
            onClick={() => handleSave('مدفوعة')}
            className="flex-[2] h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-base hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle className="size-5" />
            دفع كامل وتأكيد
          </button>
        </div>
      </div>

      {/* ── Custom Bundle Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showBundleModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBundleModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
                    <Layers className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">تكوين حزمة عروض مخصصة</h2>
                    <p className="text-sm font-bold text-slate-500">ادمج عدة منتجات في صنف واحد يخصم من المخزون تلقائياً</p>
                  </div>
                </div>
                <button onClick={() => setShowBundleModal(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors">
                  <X className="size-5" />
                </button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">اسم العرض / الحزمة</label>
                    <input type="text" value={customBundleName} onChange={e => setCustomBundleName(e.target.value)} placeholder="مثال: عرض طابعة + 4 أحبار" className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-4 font-bold text-slate-800 focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">السعر الإجمالي للحزمة</label>
                    <input type="number" min="0" value={customBundlePrice} onChange={e => setCustomBundlePrice(parseFloat(e.target.value) || '')} placeholder="سعر العرض" className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-4 font-mono font-black text-slate-800 focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-500/10 transition-all" />
                  </div>
                </div>

                <div className="border border-slate-200 rounded-[1.5rem]">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-[1.5rem]">
                    <span className="font-black text-slate-700">مكونات الحزمة ({customBundleItems.length})</span>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {customBundleItems.map((comp, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                        <div className="flex-1 font-bold text-sm text-slate-800">{comp.productName}</div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[10px] font-black text-slate-400">الكمية:</label>
                          <input type="number" min="1" value={comp.quantity} onChange={e => {
                            const val = parseInt(e.target.value) || 1
                            setCustomBundleItems(prev => prev.map((c, i) => i === idx ? { ...c, quantity: val } : c))
                          }} className="w-16 h-8 text-center bg-slate-50 border border-slate-200 rounded-lg font-mono font-black text-sm" />
                          <button onClick={() => setCustomBundleItems(prev => prev.filter((_, i) => i !== idx))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="relative mt-4">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input type="text" value={bundleSearchQuery} onChange={e => setBundleSearchQuery(e.target.value)} placeholder="ابحث عن منتج لإضافته للحزمة..." className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 pr-10 pl-4 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                      
                      {bundleSearchQuery.trim() && (
                        <div className="absolute bottom-full right-0 mb-2 w-full bg-white border border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-xl z-50 max-h-48 overflow-y-auto p-2">
                          {products.filter(p => p.name.toLowerCase().includes(bundleSearchQuery.toLowerCase())).map(p => (
                            <div key={p.id} onClick={() => {
                              setCustomBundleItems(prev => {
                                const exists = prev.find(i => i.productId === p.id)
                                if (exists) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)
                                return [...prev, { productId: p.id, productName: p.name, quantity: 1 }]
                              })
                              setBundleSearchQuery('')
                            }} className="p-2 hover:bg-fuchsia-50 hover:text-fuchsia-700 cursor-pointer rounded-lg text-sm font-bold transition-colors flex justify-between">
                              <span>{p.name}</span>
                              <span className="text-slate-400 font-mono text-xs">متوفر: {p.stock}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-8 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button onClick={handleAddCustomBundle} className="flex-1 h-14 rounded-2xl bg-fuchsia-600 text-white font-black hover:bg-fuchsia-700 transition-colors shadow-md shadow-fuchsia-600/20">
                  إضافة الحزمة للفاتورة
                </button>
                <button onClick={() => setShowBundleModal(false)} className="px-8 h-14 rounded-2xl bg-white text-slate-600 font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
