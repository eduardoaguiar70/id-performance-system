"use client";

import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function MultiSelect({ label, options, value, onChange }: MultiSelectProps) {
  const [busca, setBusca] = useState("");
  const filtradas = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(busca.toLowerCase())),
    [options, busca]
  );

  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 border px-3 py-1.5 text-xs transition-colors",
            value.length ? "border-primary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="font-semibold uppercase tracking-wider">{label}</span>
          {value.length > 0 && (
            <span className="bg-primary text-primary-foreground px-1.5 text-[10px] font-bold">{value.length}</span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0 rounded-none">
        <div className="p-2 border-b border-border flex items-center gap-2">
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar ${label.toLowerCase()}...`}
            className="flex-1 bg-background border border-border px-2 py-1.5 text-xs outline-none focus:border-primary"
          />
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtradas.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">Nenhum valor no período.</p>
          ) : (
            filtradas.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
              >
                <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} />
                <span className="truncate" title={opt}>
                  {opt}
                </span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
