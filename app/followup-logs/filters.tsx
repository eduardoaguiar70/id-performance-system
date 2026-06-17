"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search, CalendarDays, X, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function FollowupFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState(searchParams.get("phone") || "");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Derive selected date from URL (format: YYYY-MM-DD)
  const selectedDateParam = searchParams.get("date");
  const isCustomDate =
    selectedDateParam &&
    selectedDateParam !== "hoje" &&
    selectedDateParam !== "7dias";
  const selectedDate = isCustomDate ? new Date(selectedDateParam + "T12:00:00") : undefined;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handlePhoneSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ phone });
  };

  const clearPhone = () => {
    setPhone("");
    updateParams({ phone: "" });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const formatted = format(date, "yyyy-MM-dd");
    updateParams({ date: formatted });
    setCalendarOpen(false);
  };

  const activeDate = searchParams.get("date") || "";

  const quickFilterClass = (value: string) =>
    `px-4 py-2 text-sm font-bold border tracking-wide uppercase transition-all duration-150 ${
      activeDate === value
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-transparent border-border/40 text-muted-foreground hover:text-foreground hover:border-muted-foreground"
    }`;

  return (
    <div className="mb-8 space-y-3">
      {/* Row 1: Search + Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        {/* Phone Search */}
        <form
          onSubmit={handlePhoneSearch}
          className="relative flex-1 group"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            id="followup-phone-search"
            type="text"
            placeholder="Buscar por telefone..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-card border border-border/40 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-none pl-10 pr-10 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60"
          />
          {phone && (
            <button
              type="button"
              onClick={clearPhone}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Quick Filters */}
        <div className="flex gap-1.5 shrink-0">
          <button
            id="filter-todos"
            onClick={() => {
              setPhone("");
              updateParams({ date: "", phone: "" });
            }}
            className={quickFilterClass("")}
          >
            Todos
          </button>
          <button
            id="filter-hoje"
            onClick={() => updateParams({ date: "hoje" })}
            className={quickFilterClass("hoje")}
          >
            Hoje
          </button>
          <button
            id="filter-7dias"
            onClick={() => updateParams({ date: "7dias" })}
            className={quickFilterClass("7dias")}
          >
            7 dias
          </button>

          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                id="filter-date-picker"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border tracking-wide uppercase transition-all duration-150 ${
                  isCustomDate
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent border-border/40 text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                {isCustomDate && selectedDate
                  ? format(selectedDate, "dd/MM/yy", { locale: ptBR })
                  : "Data"}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 border border-border/60 bg-card rounded-none shadow-xl"
              align="end"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                locale={ptBR}
                initialFocus
              />
              {isCustomDate && (
                <div className="border-t border-border/40 p-2">
                  <button
                    onClick={() => {
                      updateParams({ date: "" });
                      setCalendarOpen(false);
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground py-1 flex items-center justify-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Limpar data
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active filter chips */}
      {(activeDate || phone) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Filtros ativos:</span>
          {phone && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
              Tel: {phone}
              <button onClick={clearPhone} className="hover:text-primary/60 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeDate && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
              {activeDate === "hoje"
                ? "Hoje"
                : activeDate === "7dias"
                ? "Últimos 7 dias"
                : isCustomDate && selectedDate
                ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : activeDate}
              <button
                onClick={() => updateParams({ date: "" })}
                className="hover:text-primary/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
