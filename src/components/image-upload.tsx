"use client";

import { useRef } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value: string;
  onChange: (base64: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  className,
  size = "md",
  label = "رفع صورة",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("حجم الصورة يجب أن يكون أقل من 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      {value ? (
        <div className={cn("relative overflow-hidden rounded-xl border border-border", sizeClasses[size])}>
          <Image
            src={value}
            alt="uploaded"
            fill
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute left-1 top-1 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5",
            sizeClasses[size]
          )}
        >
          <Camera className="h-5 w-5" />
          <span className="text-[10px]">{label}</span>
        </button>
      )}
      {!value && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 text-[11px] text-primary hover:underline"
        >
          اختيار ملف
        </button>
      )}
    </div>
  );
}
