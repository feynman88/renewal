"use client";

import { useRef, useState } from "react";

export function DropZone({
  label,
  fileName,
  error,
  onFile,
}: {
  label: string;
  fileName: string;
  error?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className={`w-full rounded-lg border-2 border-dashed px-4 py-3 text-left text-sm transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
        }`}
      >
        <span className="font-medium">{label}</span>
        <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
          {fileName} — drop a CSV here or click to replace
        </span>
      </button>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.currentTarget.value = ""; // allow re-picking the same filename after a fix
        }}
      />
    </div>
  );
}
