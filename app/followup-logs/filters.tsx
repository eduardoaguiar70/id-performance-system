"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search } from "lucide-react";

export function FollowupFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  
  // Update URL params
  const updateParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const handlePhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("phone", phone);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full max-w-2xl mb-12">
      <form onSubmit={handlePhoneSearch} className="relative flex-1 w-full group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Buscar por telefone..."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-card border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-none px-10 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground shadow-sm"
        />
      </form>
      
      <div className="flex gap-2 w-full sm:w-auto">
        <button
          onClick={() => updateParams("date", "")}
          className={`px-4 py-3 text-sm font-medium border rounded-none transition-colors ${
            !searchParams.get("date") 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground"
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => updateParams("date", "hoje")}
          className={`px-4 py-3 text-sm font-medium border rounded-none transition-colors ${
            searchParams.get("date") === "hoje"
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground"
          }`}
        >
          Hoje
        </button>
        <button
          onClick={() => updateParams("date", "7dias")}
          className={`px-4 py-3 text-sm font-medium border rounded-none transition-colors ${
            searchParams.get("date") === "7dias"
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground"
          }`}
        >
          Últimos 7 dias
        </button>
      </div>
    </div>
  );
}
