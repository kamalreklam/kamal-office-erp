"use client";

import * as React from "react";

export function Wave({
  width = 120,
  height = 12,
  cycles = 3,
  color = "var(--gold)",
  sw = 1.6,
  className,
  animate = true,
}: {
  width?: number;
  height?: number;
  cycles?: number;
  color?: string;
  sw?: number;
  className?: string;
  animate?: boolean;
}) {
  const A = height / 2.6;
  const Y = height / 2;
  const seg = width / (cycles * 2);
  let d = `M0,${Y}`;

  for (let i = 0; i < cycles * 2; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    d += ` q${seg / 2},${dir * A * 2} ${seg},0`;
  }

  const animStyle: React.CSSProperties | undefined = animate
    ? ({
        strokeDasharray: width * 1.3,
        strokeDashoffset: 0,
        ["--draw-len" as string]: width * 1.3,
        animation: "mawj-draw 1.4s cubic-bezier(.4,0,.2,1) both",
      } as React.CSSProperties)
    : undefined;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" style={animStyle} />
    </svg>
  );
}
