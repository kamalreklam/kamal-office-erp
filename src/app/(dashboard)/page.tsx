"use client"
import { DashboardSkeleton } from '@/components/skeletons'
import { AnimatedCounter } from '@/components/animated-counter'
import { RevenueChart } from '@/components/revenue-chart'
import { useStore } from '@/lib/store'
import {
  getLowStockProducts,
  getTotalRevenue,
  formatCurrency,
  getStatusColor,
} from '@/lib/data'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, BarChart3, Package, FileText, Users, ClipboardList, 
  AlertTriangle, TrendingUp, DollarSign, ArrowUpRight 
} from "lucide-react"

export default function DashboardPage() {
  const { invoices, products, clients, orders, settings, connectionStatus } = useStore()
  const router = useRouter()

  if (connectionStatus === 'loading') {
    return <DashboardSkeleton />
  }

  const totalRevenue = getTotalRevenue(invoices)
  const lowStockItems = getLowStockProducts(products)
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
  const paidCount = invoices.filter(i => i.status === 'مدفوعة').length
  const unpaidCount = invoices.filter(i => i.status === 'غير مدفوعة').length
  const activeOrders = orders.filter(o => o.status !== 'مكتمل').length

  return (
    <div className="pb-32 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">لوحة التحكم</h1>
            <p className="text-slate-500 font-medium mt-1">مرحباً بك في نظام إدارة {settings.businessName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/invoices/new" className="flex-1 md:flex-none">
              <button className="w-full md:w-auto h-14 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-[0_8px_20px_-6px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2">
                <Plus className="size-5" />
                فاتورة جديدة
              </button>
            </Link>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 end-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign className="size-24 text-emerald-500 -mt-6 -me-6 transform rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="size-6" />
                </div>
                <h3 className="font-bold text-slate-500">الإيرادات</h3>
              </div>
              <div className="text-3xl font-black text-slate-900">{formatCurrency(totalRevenue)}</div>
              <p className="text-sm font-bold text-emerald-600 mt-2">من الفواتير المدفوعة</p>
            </div>
          </div>

          {/* Invoices */}
          <Link href="/invoices" className="block outline-none">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all relative overflow-hidden group h-full">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="size-6" />
                  </div>
                  <h3 className="font-bold text-slate-500">الفواتير</h3>
                </div>
                <div className="text-3xl font-black text-slate-900"><AnimatedCounter value={invoices.length} /></div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-bold text-emerald-600">{paidCount} مدفوعة</span>
                  <span className="text-sm font-bold text-amber-500">{unpaidCount} معلقة</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Products */}
          <Link href="/inventory" className="block outline-none">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all relative overflow-hidden group h-full">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lowStockItems.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Package className="size-6" />
                  </div>
                  <h3 className="font-bold text-slate-500">المنتجات</h3>
                </div>
                <div className="text-3xl font-black text-slate-900"><AnimatedCounter value={products.length} /></div>
                <p className={`text-sm font-bold mt-2 ${lowStockItems.length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {lowStockItems.length > 0 ? `${lowStockItems.length} منتجات منخفضة المخزون` : 'جميع المنتجات متوفرة'}
                </p>
              </div>
            </div>
          </Link>

          {/* Clients & Orders */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ClipboardList className="size-6" />
                </div>
                <h3 className="font-bold text-slate-500">الطلبات النشطة</h3>
              </div>
              <div className="text-3xl font-black text-slate-900"><AnimatedCounter value={activeOrders} /></div>
              <p className="text-sm font-bold text-slate-400 mt-2">
                <span className="text-purple-600 font-black">{clients.length}</span> عميل مسجل
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black text-slate-900">تحليل المبيعات</h2>
                <p className="text-sm font-bold text-slate-400 mt-1">إيرادات الفواتير للأشهر الستة الماضية</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <RevenueChart 
                data={invoices
                  .filter(inv => inv.status === 'مدفوعة' || inv.status === 'مدفوعة جزئياً')
                  .map(inv => ({ date: inv.createdAt, total: inv.total }))
                } 
              />
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col h-[400px] lg:h-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <AlertTriangle className="size-5" />
                </div>
                <h2 className="text-xl font-black text-slate-900">تنبيهات المخزون</h2>
              </div>
              {lowStockItems.length > 0 && (
                <div className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-black rounded-lg">
                  {lowStockItems.length}
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Package className="size-12 text-slate-200 mb-3" />
                  <p className="text-slate-400 font-bold">جميع المنتجات متوفرة بكميات كافية</p>
                </div>
              ) : (
                lowStockItems.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">{product.category} · الحد: {product.minStock}</p>
                    </div>
                    <div className="ms-3 text-left shrink-0">
                      <div className="inline-flex px-3 py-1 rounded-lg bg-rose-100 text-rose-700 text-sm font-black">
                        {product.stock} {product.unit}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Invoices List */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="size-5" />
              </div>
              <h2 className="text-xl font-black text-slate-900">آخر الفواتير</h2>
            </div>
            <Link href="/invoices" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
              عرض الكل
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="size-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">لا توجد فواتير بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs font-black text-slate-400 uppercase bg-slate-50 rounded-xl">
                  <tr>
                    <th className="px-6 py-4 rounded-s-xl">رقم الفاتورة</th>
                    <th className="px-6 py-4">العميل</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4 rounded-e-xl text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-5 font-bold text-indigo-600 group-hover:text-indigo-700">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-700">
                        {inv.clientName}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-black ${getStatusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-black text-slate-900 text-left font-mono">
                        {formatCurrency(inv.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
