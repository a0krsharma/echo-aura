"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full border border-standard p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-white" />
              <h2 className="font-serif italic text-xl text-white">Something went wrong</h2>
            </div>
            <p className="font-mono text-xs text-secondary">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 border border-standard text-white font-mono text-xs tracking-widest uppercase py-3 hover:border-white hover:bg-tertiary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className = "" }: ErrorMessageProps) {
  return (
    <div className={`border border-standard p-4 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-secondary" />
        <span className="font-mono text-xs text-secondary tracking-widest uppercase">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="font-mono text-xs text-secondary tracking-widest uppercase border border-standard px-2 py-1 hover:border-white hover:text-white transition-colors cursor-pointer"
        >
          RETRY
        </button>
      )}
    </div>
  );
}
