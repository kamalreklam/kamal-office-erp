"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Plus, Users, Package, Settings, Home, X } from "lucide-react";

export function FloatingDock() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  // Define dock items
  const items = [
    { name: "الرئيسية", icon: Home, href: "/" },
    { name: "فاتورة جديدة", icon: Plus, href: "/invoices/new", activePattern: "/invoices/new", color: "bg-indigo-600 text-white" },
    { name: "الفواتير", icon: FileText, href: "/invoices" },
    { name: "العملاء", icon: Users, href: "/clients" },
    { name: "المخزون", icon: Package, href: "/inventory" },
    { name: "الإعدادات", icon: Settings, href: "/settings" },
  ];

  if (!isVisible) return null;

  return (
    <div className="hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] group">
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative bg-white/80 backdrop-blur-xl border border-white shadow-2xl shadow-indigo-900/10 rounded-3xl p-3 flex items-center gap-2"
      >
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-3 -right-3 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-transform scale-0 group-hover:scale-100"
          title="إخفاء"
        >
          <X className="size-3" />
        </button>

        {items.map((item) => {
          const isActive = item.activePattern 
            ? pathname === item.activePattern 
            : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          const baseClass = item.color || "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50";

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.15, y: -8 }}
                whileTap={{ scale: 0.95 }}
                className={`group/item relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isActive 
                    ? item.color || "bg-indigo-100 text-indigo-600 shadow-inner" 
                    : baseClass
                }`}
              >
                <item.icon className="size-6" />
                
                {/* Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover/item:opacity-100 transition-opacity bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">
                  {item.name}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                </div>
                
                {isActive && (
                  <motion.div layoutId="dock-indicator" className="absolute -bottom-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
