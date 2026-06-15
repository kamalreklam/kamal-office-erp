"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/data";

interface RevenueChartProps {
  data: { date: string; total: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Aggregate data by month for a smoother chart, or just use raw data if already grouped
  const chartData = useMemo(() => {
    // Simple mock aggregation or formatting. Assuming 'date' is YYYY-MM-DD
    const grouped = data.reduce((acc, curr) => {
      const month = curr.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = 0;
      acc[month] += curr.total;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, total]) => ({
        date, // We could format this better
        total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6); // Last 6 months
  }, [data]);

  // If no data, return a placeholder
  if (chartData.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center text-slate-400">
        لا تتوفر بيانات كافية لعرض الرسم البياني
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            tickFormatter={(value) => `${value / 1000}k`}
            dx={-10}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white/90 backdrop-blur-md border border-mist/60 shadow-xl p-3 rounded-2xl">
                    <p className="text-slate-500 text-xs mb-1 font-bold">{label}</p>
                    <p className="text-primary font-black font-mono text-lg">
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--primary-color)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorTotal)"
            activeDot={{ r: 6, strokeWidth: 0, fill: "var(--primary-color)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
