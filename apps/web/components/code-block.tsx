"use client";

import { useState, useCallback } from "react";

interface CodeBlockProps {
  code: string;
  className?: string;
}

export default function CodeBlock({ code, className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div
      className={`group relative inline-flex items-center gap-3 rounded-lg border border-[var(--foreground)]/10 bg-[var(--foreground)]/5 px-4 py-3 font-mono text-sm cursor-pointer hover:bg-[var(--foreground)]/10 transition-colors ${className}`}
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopy();
        }
      }}
      aria-label="Copy command"
    >
      <code className="select-none">{code}</code>
      <span
        className={`text-xs font-sans transition-opacity ${
          copied
            ? "opacity-100 text-green-600"
            : "opacity-60 group-hover:opacity-100"
        }`}
      >
        {copied ? "Copied!" : "Click to copy"}
      </span>
    </div>
  );
}
