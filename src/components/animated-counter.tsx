"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useInView, useTransform, motion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
}

export function AnimatedCounter({
  value,
  format,
  className,
  style,
  duration = 1.2,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, {
    duration: duration * 1000,
    bounce: 0,
  });
  const display = useTransform(spring, (v) =>
    format ? format(Math.round(v)) : Math.round(v).toLocaleString("en-US")
  );

  useEffect(() => {
    if (isInView) {
      motionVal.set(value);
    }
  }, [isInView, value, motionVal]);

  return (
    <motion.span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {display}
    </motion.span>
  );
}
