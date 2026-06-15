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
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} 
            tickFormatter={(value) => `${value / 1000}k`}
            dx={-10}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <Tooltip
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 rounded-2xl relative overflow-hidden transform scale-105 transition-transform duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />
                    <p className="text-slate-400 text-xs mb-1.5 font-bold uppercase tracking-wider">{label}</p>
                    <p className="text-white font-black font-mono text-2xl tracking-tight">
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
            stroke="#8b5cf6"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorTotal)"
            activeDot={{ r: 8, strokeWidth: 4, stroke: "#fff", fill: "#8b5cf6", style: { filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.8))' } }}
            style={{ filter: "drop-shadow(0 4px 6px rgba(139,92,246,0.3))" }}
            isAnimationActive={true}
            animationDuration={2000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
