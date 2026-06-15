"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box, Paper, Typography, Button, Stack, IconButton, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, TableFooter,
} from "@mui/material";
import { useStore } from "@/lib/store";
import { type Invoice, formatCurrency } from "@/lib/data";

function statusColor(s: string): "success" | "warning" | "error" | "default" {
  if (s === "مدفوعة") return "success";
  if (s === "مدفوعة جزئياً") return "warning";
  if (s === "غير مدفوعة") return "error";
  return "default";
}

export default function ProductHistoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { products, invoices, settings } = useStore();
  const product = products.find((p) => p.id === id);

  if (!product) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Stack sx={{ alignItems: "center", gap: 2 }}>
          <Typography color="text.secondary">المنتج غير موجود</Typography>
          <Button variant="outlined" onClick={() => router.push("/inventory")}>العودة للمخزون</Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", py: 3 }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, mb: 4 }}>
        <IconButton onClick={() => router.push("/inventory")} size="small">
          <i className="tabler-arrow-right" style={{ fontSize: 18 }} />
        </IconButton>
        <i className="tabler-history" style={{ fontSize: 20, color: "var(--mui-palette-primary-main)" }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>سجل مبيعات</Typography>
        <Typography variant="body2" color="text.secondary">{product.name}</Typography>
      </Stack>

      <HistoryContent product={product} invoices={invoices} currencySymbol={settings.currencySymbol} />
    </Box>
  );
}

function HistoryContent({
  product,
  invoices,
  currencySymbol,
}: {
  product: { id: string; name: string; stock: number; unit: string; minStock: number };
  invoices: Invoice[];
  currencySymbol: string;
}) {
  const deductsStock = (s: string) => s !== "مسودة" && s !== "ملغاة";

  type SaleRecord = {
    invoiceId: string; invoiceNumber: string; date: string; clientName: string;
    qty: number; status: string; viaBundle: boolean; bundleName?: string; revenue: number;
  };

  const sales: SaleRecord[] = [];

  invoices.forEach((inv) => {
    const items = Array.isArray(inv.items) ? inv.items : (inv.items as any)?._items || [];
    items.forEach((item: any) => {
      if (!item.isBundle && item.productId === product.id) {
        sales.push({
          invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, date: inv.createdAt,
          clientName: inv.clientName, qty: item.quantity, status: inv.status,
          viaBundle: false, revenue: item.total ?? item.quantity * item.unitPrice,
        });
      }
      if (item.isBundle && item.bundleComponents) {
        const comp = (item.bundleComponents as any[]).find((c: any) => c.productId === product.id);
        if (comp) {
          sales.push({
            invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, date: inv.createdAt,
            clientName: inv.clientName, qty: comp.quantity * item.quantity, status: inv.status,
            viaBundle: true, bundleName: item.productName, revenue: 0,
          });
        }
      }
    });
  });

  sales.sort((a, b) => b.date.localeCompare(a.date));

  const activeSales = sales.filter((s) => deductsStock(s.status));
  const totalSold = activeSales.reduce((sum, s) => sum + s.qty, 0);
  const impliedInitial = product.stock + totalSold;
  const totalRevenue = activeSales.filter((s) => !s.viaBundle).reduce((sum, s) => sum + s.revenue, 0);

  return (
    <Stack sx={{ gap: 2 }}>
      {/* Summary stats */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction="row" divider={<Box sx={{ width: 1, bgcolor: "divider" }} />} spacing={3}>
          <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">المخزون الحالي</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }} color={product.stock <= 0 ? "error.main" : "text.primary"}>
              {product.stock}
            </Typography>
            <Typography variant="caption" color="text.secondary">{product.unit}</Typography>
          </Stack>
          <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">إجمالي المباع</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }} color="warning.main">{totalSold}</Typography>
            <Typography variant="caption" color="text.secondary">{product.unit}</Typography>
          </Stack>
          <Stack sx={{ flex: 1, alignItems: "center", gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">المخزون الأولي المتوقع</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }} color="primary.main">{impliedInitial}</Typography>
            <Typography variant="caption" color="text.secondary">= حالي + مباع</Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* Revenue row */}
      <Paper sx={{ px: 3, py: 2, borderRadius: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">إجمالي الإيرادات المباشرة</Typography>
        <Typography variant="body1" sx={{ fontWeight: 700 }} color="success.main">
          {currencySymbol}{totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </Typography>
      </Paper>

      {/* Sales table */}
      {sales.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 3, textAlign: "center" }}>
          <i className="tabler-check" style={{ fontSize: 40, opacity: 0.3 }} />
          <Typography color="text.secondary" sx={{ mt: 1 }}>لا توجد فواتير تحتوي على هذا المنتج</Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفاتورة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>العميل</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>الكمية</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {sales.map((s, i) => {
                const deducts = deductsStock(s.status);
                return (
                  <TableRow key={`${s.invoiceId}-${i}`} sx={{ opacity: deducts ? 1 : 0.5 }}>
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{s.date}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 600 }}>{s.invoiceNumber}</TableCell>
                    <TableCell>{s.clientName}</TableCell>
                    <TableCell align="center">
                      <Typography sx={{ fontWeight: 700 }} color={deducts ? "warning.main" : "text.secondary"} variant="body2">
                        {deducts ? "-" : ""}{s.qty}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.viaBundle ? `طقم — ${s.bundleName}` : "مباشر"}
                        color={s.viaBundle ? "secondary" : "primary"}
                        variant="outlined"
                        sx={{ fontSize: "0.7rem" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.status} color={statusColor(s.status)} variant="tonal" sx={{ fontSize: "0.7rem" }} />
                    </TableCell>
                    <TableCell align="center">
                      <Link href={`/invoices/${s.invoiceId}`} target="_blank">
                        <IconButton size="small">
                          <i className="tabler-external-link" style={{ fontSize: 14 }} />
                        </IconButton>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell colSpan={3} sx={{ fontWeight: 600, color: "text.secondary" }}>
                  المجموع ({activeSales.length} فاتورة نشطة)
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: "warning.main" }}>
                  -{totalSold}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}
