"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = "md", text, className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-white`} />
      {text && (
        <span className="font-mono text-xs tracking-widest uppercase text-secondary">
          {text}
        </span>
      )}
    </div>
  );
}

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ButtonLoading({ loading, children, className = "" }: ButtonLoadingProps) {
  return (
    <button disabled={loading} className={className}>
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        children
      )}
    </button>
  );
}
