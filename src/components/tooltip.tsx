'use client'

import { ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function Tooltip({ children, content, side = 'top' }: { children: ReactNode, content: string, side?: 'top'|'bottom'|'left'|'right' }) {
  const [show, setShow] = useState(false)

  const getPosition = () => {
    switch(side) {
      case 'top': return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      case 'bottom': return 'top-full left-1/2 -translate-x-1/2 mt-2'
      case 'left': return 'right-full top-1/2 -translate-y-1/2 mr-2'
      case 'right': return 'left-full top-1/2 -translate-y-1/2 ml-2'
    }
  }

  return (
    <div 
      className="relative inline-flex" 
      onMouseEnter={() => setShow(true)} 
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: side === 'top' ? 5 : side === 'bottom' ? -5 : 0, x: side === 'left' ? 5 : side === 'right' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute ${getPosition()} z-[9999] px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-lg whitespace-nowrap pointer-events-none shadow-lg border border-white/10`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
