'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDebounce } from '@/lib/use-debounce'
import { useStore } from '@/lib/store'
import { type Product, getLowStockProducts, formatCurrency } from '@/lib/data'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { exportCSV } from '@/lib/export'
import { DateRangeExportButton, type DateRange } from '@/components/date-range-picker'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { InlineEdit } from '@/components/inline-edit'
import { CopyToClipboard } from '@/components/copy-to-clipboard'
import { EmptyState } from '@/components/empty-state'
import {
  Plus,
  Search,
  Download,
  MessageCircle,
  AlertTriangle,
  LayoutGrid,
  List,
  History,
  Pencil,
  Trash2,
  Package,
  ChevronDown,
  ArrowUpDown,
  PlusCircle,
  MinusCircle,
  CheckSquare,
  Square,
  X,
  CheckCheck,
} from 'lucide-react'

function CategoryBadge({ category }: { category: string }) {
  const cat = category.toLowerCase();
  let colorClass = "bg-amber-50 text-amber-700 border-amber-200/60";
  let dotColor = "bg-amber-500";
  
  if (cat.includes("printer") || cat.includes("طابعات")) {
    colorClass = "bg-slate-100 text-slate-700 border-slate-200";
    dotColor = "bg-slate-500";
  } else if (cat.includes("ink") || cat.includes("حبر") || cat.includes("أحبار")) {
    colorClass = "bg-indigo-50/70 text-indigo-700 border-indigo-250/60";
    dotColor = "bg-indigo-500";
  } else if (cat.includes("tank") || cat.includes("خزان") || cat.includes("خزانات")) {
    colorClass = "bg-cyan-50 text-cyan-700 border-cyan-250/60";
    dotColor = "bg-cyan-500";
  } else if (cat.includes("paper") || cat.includes("ورق") || cat.includes("رزمة")) {
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-250/60";
    dotColor = "bg-emerald-500";
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
      <span className={`size-1.5 rounded-full ${dotColor} animate-pulse`} />
      <span>{category}</span>
    </span>
  );
}

export default function InventoryPage() {
  const router = useRouter()
  const { products, updateProduct, deleteProduct, addProduct, getProductImage, settings, connectionStatus } = useStore()

  const categories = useMemo(() => {
    return ['الكل', ...Array.from(new Set(products.map(p => p.category))).sort()]
  }, [products])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [activeCategory, setActiveCategory] = useState('الكل')
  const [sortBy, setSortBy] = useState('default')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  // Bulk edit state
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkField, setBulkField] = useState<'stock' | 'sellingPrice' | 'costPrice'>('stock')
  const [bulkValue, setBulkValue] = useState('')

  // Filter & Sort
  const filtered = useMemo(() => {
    const list = products.filter(p => {
      const q = debouncedSearch.toLowerCase()
      const matchSearch =
        debouncedSearch === '' ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      const matchCategory = activeCategory === 'الكل' || p.category === activeCategory
      return matchSearch && matchCategory
    })
    
    switch (sortBy) {
      case 'price-asc':
        return [...list].sort((a, b) => a.sellingPrice - b.sellingPrice)
      case 'price-desc':
        return [...list].sort((a, b) => b.sellingPrice - a.sellingPrice)
      case 'stock-asc':
        return [...list].sort((a, b) => a.stock - b.stock)
      case 'stock-desc':
        return [...list].sort((a, b) => b.stock - a.stock)
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      default:
        return [...list].sort((a, b) => a.category.localeCompare(b.category, 'ar'))
    }
  }, [products, debouncedSearch, activeCategory, sortBy])

  const lowStock = useMemo(() => getLowStockProducts(products), [products])
  const totalValue = filtered.reduce((sum, p) => sum + p.costPrice * p.stock, 0)
  const totalUnits = filtered.reduce((sum, p) => sum + p.stock, 0)

  // Handlers
  function handleDelete(product: Product) {
    const image = getProductImage(product.id)
    const snapshot = {
      name: product.name,
      category: product.category,
      sku: product.sku,
      description: product.description,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      ...(image ? { image } : {}),
    }
    deleteProduct(product.id)
    toast.success(`تم حذف "${product.name}" بنجاح`, {
      duration: 5000,
      action: {
        label: 'تراجع',
        onClick: () => addProduct(snapshot),
      },
    })
  }

  function shareWhatsAppSummary() {
    const lines = [
      `📦 *تقرير المخزون - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-SY', { numberingSystem: 'latn' })}`,
      '',
      `📊 *الملخص:*`,
      `  • عدد المنتجات: ${filtered.length}`,
      `  • إجمالي الوحدات: ${totalUnits.toLocaleString('en-US')} ${settings.currencySymbol || ''}`,
      `  • إجمالي قيمة المخزون: ${formatCurrency(totalValue)}`,
      '',
      `📋 *قائمة المنتجات الأهم:*`,
    ]
    filtered.slice(0, 15).forEach((p, i) => {
      const val = p.costPrice * p.stock
      const warn = p.stock <= p.minStock ? ' ⚠️ (منخفض)' : ''
      lines.push(`${i + 1}. ${p.name}${warn} | الكمية: ${p.stock} ${p.unit} | القيمة: ${formatCurrency(val)}`)
    })
    if (filtered.length > 15) {
      lines.push(`... و ${filtered.length - 15} منتجات أخرى`)
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  function shareLowStockWhatsApp() {
    if (lowStock.length === 0) return
    const lines = [
      `🔴 *تنبيه مخزون منخفض - ${settings.businessName}*`,
      `📅 التاريخ: ${new Date().toLocaleDateString('ar-SY', { numberingSystem: 'latn' })}`,
      '',
      '*المنتجات التالية انخفضت تحت الحد الأدنى وبحاجة للطلب عاجلاً:*',
    ]
    lowStock.forEach(p => {
      lines.push(`• ${p.name} (${p.sku}) | متوفر: ${p.stock} ${p.unit} (الحد: ${p.minStock})`)
    })
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map(p => p.id)))
  }

  function applyBulk() {
    const val = parseFloat(bulkValue)
    if (isNaN(val) || val < 0) { toast.error('أدخل قيمة صحيحة'); return }
    selectedIds.forEach(id => updateProduct(id, { [bulkField]: val }))
    toast.success(`تم تحديث ${selectedIds.size} صنف`)
    setSelectedIds(new Set())
    setBulkValue('')
  }

  function handleBulkDelete() {
    const count = selectedIds.size
    selectedIds.forEach(id => deleteProduct(id))
    toast.success(`تم حذف ${count} صنف`)
    setSelectedIds(new Set())
  }

  function adjustStock(productId: string, delta: number) {
    const p = products.find(prod => prod.id === productId)
    if (!p) return
    const newStock = Math.max(0, p.stock + delta)
    updateProduct(productId, { stock: newStock })
    toast.success(`تم تحديث مخزون "${p.name}" إلى ${newStock}`)
  }

  if (connectionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        {/* Page Head */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="text-center md:text-start w-full md:w-auto">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة الكتالوج والمخزون</h1>
            <p className="text-slate-500 font-medium mt-1">متابعة المنتجات والكميات المتاحة في مستودع حلب</p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              className="w-full sm:w-auto h-14 px-6 rounded-2xl bg-sky-500 border border-sky-600 text-white font-bold hover:bg-sky-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onClick={() => {
                exportCSV(
                  'inventory',
                  ['الاسم', 'الكود', 'الفئة', 'سعر التكلفة', 'سعر المبيع', 'المخزون', 'الوحدة', 'الحد الأدنى'],
                  filtered.map(p => [p.name, p.sku, p.category, String(p.costPrice), String(p.sellingPrice), String(p.stock), p.unit, String(p.minStock)])
                )
                toast.success('تم تصدير المخزون بنجاح')
              }}
            >
              <Download className="size-5" />
              <span>تصدير CSV</span>
            </button>

            <DateRangeExportButton
              label="تقرير المخزون PDF"
              className="w-full sm:w-auto h-14 px-6 rounded-2xl bg-rose-500 border border-rose-600 text-white font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
              onExport={async (range: DateRange) => {
                try {
                  const { exportInventoryReportPDF } = await import('@/lib/pdf')
                  await exportInventoryReportPDF(filtered, range, settings)
                  toast.success('تم تصدير تقرير المخزون')
                } catch (err) {
                  console.error(err)
                  toast.error('فشل تصدير التقرير')
                }
              }}
            />

            <button className="w-full sm:w-auto h-14 px-6 rounded-2xl bg-[#25D366] text-white border border-[#1DA851] font-bold hover:bg-[#1DA851] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2" onClick={shareWhatsAppSummary}>
              <MessageCircle className="size-5" />
              <span>تقرير المخزون</span>
            </button>

            <button
              onClick={() => { setBulkMode(m => !m); setSelectedIds(new Set()) }}
              className={`w-full sm:w-auto h-14 px-6 rounded-2xl font-bold border-2 transition-all shadow-sm flex items-center justify-center gap-2 ${bulkMode ? 'bg-amber-500 border-amber-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-600'}`}
            >
              <CheckCheck className="size-5" />
              <span>{bulkMode ? 'إلغاء التحرير المجمّع' : 'تحرير مجمّع'}</span>
            </button>

            <Link href="/inventory/new" className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2">
              <Plus className="size-5" />
              <span>منتج جديد</span>
            </Link>
          </div>
        </div>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-[0_0_25px_rgba(244,63,94,0.15)] ring-1 ring-rose-200/50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white text-rose-500 flex items-center justify-center shrink-0 shadow-sm border border-rose-100 relative">
              <div className="absolute inset-0 rounded-2xl bg-rose-400 opacity-20 animate-ping"></div>
              <AlertTriangle className="size-6 relative z-10" />
            </div>
            <div>
              <h4 className="font-black text-rose-800 text-lg">{lowStock.length} منتجات في حالة عجز أو مخزون منخفض</h4>
              <p className="text-sm font-bold text-rose-600 mt-1">
                {lowStock.slice(0, 4).map(p => p.name).join('، ')}
                {lowStock.length > 4 && ` و ${lowStock.length - 4} منتجات أخرى`}
              </p>
            </div>
          </div>
          <button 
            onClick={shareLowStockWhatsApp} 
            className="w-full sm:w-auto h-14 px-6 rounded-2xl bg-rose-100 text-rose-700 font-bold border border-rose-200 hover:bg-rose-200 hover:border-rose-300 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <MessageCircle className="size-5" />
            <span>تنبيه المشتريات بالواتساب</span>
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <motion.div 
        initial="hidden" animate="visible" 
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="size-6" />
              </div>
              <h3 className="font-bold text-slate-500">عدد الأصناف</h3>
            </div>
            <div className="text-3xl font-black text-slate-900">{products.length}</div>
            <p className="text-sm font-bold text-slate-400 mt-2">صنف مختلف مسجل</p>
          </div>
        </motion.div>
        
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LayoutGrid className="size-6" />
              </div>
              <h3 className="font-bold text-slate-500">إجمالي الوحدات</h3>
            </div>
            <div className="text-3xl font-black text-slate-900">{totalUnits.toLocaleString('en-US')}</div>
            <p className="text-sm font-bold text-slate-400 mt-2">قطعة/عبوة إجمالية في المخزون</p>
          </div>
        </motion.div>
        
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowUpDown className="size-6" />
              </div>
              <h3 className="font-bold text-slate-500">إجمالي قيمة المخزون</h3>
            </div>
            <div className="text-3xl font-black text-slate-900">{formatCurrency(totalValue)}</div>
            <p className="text-sm font-bold text-emerald-600 mt-2">قيمة الإجماليات بالمبيعات</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Filter and View Toggles */}
      <div className="bg-white rounded-[2rem] p-4 sm:p-6 border border-slate-100 shadow-sm mt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Left: Search input */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الكود، الفئة أو الوصف..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 ps-12 pe-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Right: Sort and View mode switches */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[160px]">
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm cursor-pointer"
              >
                <option value="default">الترتيب التلقائي</option>
                <option value="name">اسم المنتج أبجدياً</option>
                <option value="price-desc">السعر: الأعلى أولاً</option>
                <option value="price-asc">السعر: الأقل أولاً</option>
                <option value="stock-desc">المخزون: الأكثر أولاً</option>
                <option value="stock-asc">المخزون: الأقل أولاً</option>
              </select>
            </div>

            <div className="flex bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-1 shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                title="عرض القائمة"
              >
                <List className="size-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                title="عرض الشبكة"
              >
                <LayoutGrid className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mt-4 hide-scrollbar">
        {categories.map(cat => {
          const isActive = activeCategory === cat
          const count = cat === 'الكل'
            ? products.length
            : products.filter(p => p.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-2xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                isActive 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <span>{cat}</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Product Display Area */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-12 border border-slate-100 shadow-sm mt-6 flex flex-col items-center justify-center text-center">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
            <Package className="size-16 text-slate-200 mb-4" />
          </motion.div>
          <h3 className="text-xl font-black text-slate-900 mb-2">لا توجد منتجات مطابقة للمخزون</h3>
          <p className="text-slate-500 font-bold mb-6">جرّب البحث بكلمات أخرى أو اختر فئة بديلة</p>
          <Link href="/inventory/new" className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2">
            <Plus className="size-5" />
            إضافة منتج
          </Link>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW: PC Responsive Table & Mobile Cards */
        <div className="mt-6">
          {/* PC Table (displays md and up) */}
          <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="sticky top-0 z-10 text-xs font-black text-slate-400 uppercase bg-slate-50/80 backdrop-blur-md shadow-sm">
                  <tr>
                    {bulkMode && (
                      <th className="px-4 py-4">
                        <button onClick={selectedIds.size === filtered.length ? () => setSelectedIds(new Set()) : selectAll} className="text-indigo-500 hover:text-indigo-700 transition-colors">
                          {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare className="size-5" /> : <Square className="size-5" />}
                        </button>
                      </th>
                    )}
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">اسم الصنف</th>
                    <th className="px-6 py-4">الفئة</th>
                    <th className="px-6 py-4">التكلفة</th>
                    <th className="px-6 py-4">المبيع</th>
                    <th className="px-6 py-4">المخزون المتوفر</th>
                    <th className="px-6 py-4">القيمة الإجمالية</th>
                    <th className="px-6 py-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <motion.tbody
                  initial="hidden" animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                >
                  {filtered.map((product, idx) => {
                    const isEmpty = product.stock === 0
                    const isLow = product.stock > 0 && product.stock <= product.minStock
                    const img = getProductImage(product.id)
                    return (
                      <motion.tr
                        variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
                        key={product.id}
                        onDoubleClick={() => !bulkMode && router.push(`/inventory/${product.id}/edit`)}
                        onClick={() => bulkMode && toggleSelect(product.id)}
                        className={`border-b border-slate-50 transition-colors group cursor-pointer ${selectedIds.has(product.id) ? 'bg-indigo-50/60' : isEmpty ? 'grayscale opacity-60 hover:opacity-80 bg-slate-50/50' : isLow ? 'bg-rose-50/40 hover:bg-rose-50/80 shadow-[inset_4px_0_0_rgba(244,63,94,0.5)]' : 'hover:bg-slate-50'}`}
                      >
                        {bulkMode && (
                          <td className="px-4 py-4">
                            <button onClick={e => { e.stopPropagation(); toggleSelect(product.id) }} className="text-indigo-500">
                              {selectedIds.has(product.id) ? <CheckSquare className="size-5" /> : <Square className="size-5 text-slate-300" />}
                            </button>
                          </td>
                        )}
                        <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img src={img} alt="" className="size-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                            ) : (
                              <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package className="size-5" />
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-900 block">{product.name}</span>
                              <div className="font-mono text-xs font-bold text-slate-400 mt-0.5"><CopyToClipboard text={product.sku}>{product.sku}</CopyToClipboard></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <CategoryBadge category={product.category} />
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                          <InlineEdit
                            value={product.costPrice}
                            type="currency"
                            format={formatCurrency}
                            onSave={v => updateProduct(product.id, { costPrice: v })}
                          />
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                          <InlineEdit
                            value={product.sellingPrice}
                            type="currency"
                            format={formatCurrency}
                            onSave={v => updateProduct(product.id, { sellingPrice: v })}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustStock(product.id, -1)}
                              className="text-slate-400 hover:text-rose-500 bg-slate-100 hover:bg-rose-100 p-1 rounded-lg transition-colors"
                            >
                              <MinusCircle className="size-5" />
                            </button>
                            
                            <InlineEdit
                              value={product.stock}
                              onSave={v => updateProduct(product.id, { stock: v })}
                              className={`w-12 text-center font-mono text-lg font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}
                            />
                            
                            <button
                              onClick={() => adjustStock(product.id, 1)}
                              className="text-slate-400 hover:text-emerald-500 bg-slate-100 hover:bg-emerald-100 p-1 rounded-lg transition-colors"
                            >
                              <PlusCircle className="size-5" />
                            </button>
                            
                            <span className="text-xs font-bold text-slate-400 ms-1 uppercase">{product.unit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-slate-900">
                          {formatCurrency(product.costPrice * product.stock)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link 
                              href={`/inventory/${product.id}/history`}
                              className="p-2 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors"
                              title="سجل المبيعات والتعديلات"
                            >
                              <History className="size-4" />
                            </Link>
                            <Link 
                              href={`/inventory/${product.id}/edit`}
                              className="p-2 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors"
                              title="تعديل تفاصيل الصنف"
                            >
                              <Pencil className="size-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-xl transition-colors"
                              title="حذف الصنف"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </motion.tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards List (displays on mobile/tablet) */}
          <motion.div 
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="block md:hidden space-y-4"
          >
            {filtered.map(product => {
              const isEmpty = product.stock === 0
              const isLow = product.stock > 0 && product.stock <= product.minStock
              const img = getProductImage(product.id)
              return (
                <motion.div
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                  key={product.id}
                  onDoubleClick={() => !bulkMode && router.push(`/inventory/${product.id}/edit`)}
                  onClick={() => bulkMode && toggleSelect(product.id)}
                  className={`bg-white rounded-[2rem] border p-5 cursor-pointer relative ${selectedIds.has(product.id) ? 'border-indigo-400 ring-2 ring-indigo-300/40 bg-indigo-50/30' : isEmpty ? 'grayscale opacity-75 border-slate-200' : isLow ? 'border-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/20' : 'border-slate-100 shadow-sm'}`}
                >
                  {bulkMode && (
                    <button onClick={e => { e.stopPropagation(); toggleSelect(product.id) }} className="absolute top-4 start-4 text-indigo-500 z-10">
                      {selectedIds.has(product.id) ? <CheckSquare className="size-6" /> : <Square className="size-6 text-slate-300" />}
                    </button>
                  )}
                  <div className="flex gap-4">
                    {img ? (
                      <img src={img} alt="" className="size-16 rounded-2xl object-cover border border-slate-200 shrink-0 shadow-sm" />
                    ) : (
                      <div className="size-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <Package className="size-6" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-slate-900 text-lg block leading-tight">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <CategoryBadge category={product.category} />
                        {isEmpty && <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black bg-slate-200 text-slate-600">نفذت الكمية</span>}
                        {isLow && <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.2)]">منخفض المخزون</span>}
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-400 mt-2"><CopyToClipboard text={product.sku}>{product.sku}</CopyToClipboard></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                    {/* Stock Quick Adjustment Panel */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => adjustStock(product.id, -1)}
                        className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95 shadow-sm"
                      >
                        <MinusCircle className="size-6" />
                      </button>

                      <div className="text-center min-w-[60px]">
                        <span className={`font-mono text-2xl font-black block ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                          {product.stock}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">{product.unit}</span>
                      </div>

                      <button
                        onClick={() => adjustStock(product.id, 1)}
                        className="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all active:scale-95 shadow-sm"
                      >
                        <PlusCircle className="size-6" />
                      </button>
                    </div>

                    <div className="text-left bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">الإجمالي</span>
                      <span className="font-mono text-lg font-black text-indigo-600">{formatCurrency(product.costPrice * product.stock)}</span>
                    </div>
                  </div>

                  {/* Actions footer for mobile card */}
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <Link 
                      href={`/inventory/${product.id}/history`}
                      className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2 transition-colors flex-1 justify-center active:scale-95"
                    >
                      <History className="size-5" />
                      السجل
                    </Link>
                    <Link 
                      href={`/inventory/${product.id}/edit`}
                      className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center text-slate-500 transition-colors active:scale-95"
                    >
                      <Pencil className="size-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(product)}
                      className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center text-slate-500 transition-colors active:scale-95"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      ) : (
        /* GRID VIEW: Cards Grid */
        <motion.div 
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6"
        >
          {filtered.map(product => {
            const isLow = product.stock <= product.minStock
            const img = getProductImage(product.id)
            return (
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                key={product.id}
                onClick={() => bulkMode && toggleSelect(product.id)}
                className={`bg-white rounded-[2rem] border ${selectedIds.has(product.id) ? 'border-indigo-400 ring-2 ring-indigo-300/40 bg-indigo-50/20' : isLow ? 'border-rose-200 shadow-[0_4px_15px_-3px_rgba(244,63,94,0.15)]' : 'border-slate-100 shadow-sm'} p-3 flex flex-col justify-between hover:shadow-md transition-shadow group relative ${bulkMode ? 'cursor-pointer' : ''}`}
              >
                {bulkMode && (
                  <button onClick={e => { e.stopPropagation(); toggleSelect(product.id) }} className="absolute top-2 start-2 z-10 text-indigo-500">
                    {selectedIds.has(product.id) ? <CheckSquare className="size-5" /> : <Square className="size-5 text-slate-300" />}
                  </button>
                )}
                {/* Image / Thumbnail */}
                <div className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="size-10" />
                    </div>
                  )}
                  {isLow && (
                    <span className="absolute top-2 end-2 inline-flex px-2 py-1 rounded-lg text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">منخفض</span>
                  )}
                </div>

                {/* Content details */}
                <div className="mt-4 flex-1">
                  <div className="mb-2">
                    <CategoryBadge category={product.category} />
                  </div>
                  <span className="font-black text-slate-900 text-sm block leading-tight mt-1 truncate" title={product.name}>
                    {product.name}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-400 block mt-1">{product.sku}</span>
                </div>

                {/* Pricing and Stock info */}
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-0.5">السعر</span>
                    <span className="font-mono text-sm font-black text-indigo-600">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5 border border-slate-100">
                    <button
                      onClick={(e) => { e.preventDefault(); adjustStock(product.id, -1) }}
                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md p-0.5 transition-colors"
                      title="إنقاص المخزون"
                    >
                      <MinusCircle className="size-4" />
                    </button>
                    <div className="text-center min-w-[28px]">
                      <span className={`font-mono text-sm font-black ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                        {product.stock}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); adjustStock(product.id, 1) }}
                      className="text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-md p-0.5 transition-colors"
                      title="زيادة المخزون"
                    >
                      <PlusCircle className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Quick actions row */}
                <div className="flex gap-2 mt-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <Link 
                    href={`/inventory/${product.id}/edit`} 
                    className="h-10 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 flex-1 flex items-center justify-center transition-colors shadow-sm"
                    title="تعديل"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(product)} 
                    className="h-10 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 text-slate-600 hover:text-rose-600 flex-1 flex items-center justify-center transition-colors shadow-sm"
                    title="حذف"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Row count footer */}
      <div className="text-center font-bold text-slate-400 pt-8 pb-4">
        إجمالي الأصناف المعروضة: {filtered.length} صنفاً
      </div>
      </div>
    </div>

    {/* Bulk Action Bar — outside scroll container, fixed to viewport */}
    {bulkMode && (
      <div className={`fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 ${selectedIds.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-white border-t-2 border-indigo-200 shadow-[0_-8px_30px_-5px_rgba(79,70,229,0.2)] px-4 py-4" dir="rtl">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            {/* Count + select all / clear */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-sm">
                <CheckCheck className="size-4" />
                {selectedIds.size} صنف محدد
              </span>
              <button onClick={selectAll} className="text-xs font-bold text-indigo-600 hover:underline">تحديد الكل</button>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <X className="size-3" /> إلغاء التحديد
              </button>
            </div>

            <div className="h-px sm:h-8 sm:w-px bg-slate-200 w-full sm:w-auto" />

            {/* Field + value + apply */}
            <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
              <select
                value={bulkField}
                onChange={e => setBulkField(e.target.value as typeof bulkField)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0"
              >
                <option value="stock">المخزون</option>
                <option value="sellingPrice">سعر المبيع</option>
                <option value="costPrice">سعر التكلفة</option>
              </select>
              <input
                type="number"
                min="0"
                placeholder="القيمة الجديدة"
                value={bulkValue}
                onChange={e => setBulkValue(e.target.value)}
                className="h-11 flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={applyBulk}
                disabled={!bulkValue}
                className="h-11 px-5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
              >
                تطبيق
              </button>
            </div>

            <div className="h-px sm:h-8 sm:w-px bg-slate-200 w-full sm:w-auto" />

            {/* Bulk delete */}
            <button
              onClick={handleBulkDelete}
              className="h-11 px-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-all flex items-center gap-2 shrink-0"
            >
              <Trash2 className="size-4" />
              حذف المحدد
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
