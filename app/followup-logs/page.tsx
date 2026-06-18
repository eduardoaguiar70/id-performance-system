import { supabase } from "@/lib/supabase";
import { FollowupFilters } from "./filters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, MessageSquare, AlertCircle, Send } from "lucide-react";

interface FollowupLog {
  id?: string;
  created_at: string;
  contact_name?: string;
  phone?: string;
  telefone?: string;
  message?: string;
  mensagem?: string;
  message_sent?: string;
  spintax?: string;
  status?: string;
}

// Helper for phone formatting
function formatPhone(phone?: string) {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 13) {
    // +55 11 9xxxx-xxxx
    return `+${cleaned.substring(0, 2)} (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 9)}-${cleaned.substring(9, 13)}`;
  }
  if (cleaned.length === 12) {
    return `+${cleaned.substring(0, 2)} (${cleaned.substring(2, 4)}) ${cleaned.substring(4, 8)}-${cleaned.substring(8, 12)}`;
  }
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`;
  }
  return phone;
}

export const dynamic = "force-dynamic";

export default async function FollowupLogsPage({
  searchParams,
}: {
  searchParams: { phone?: string; date?: string };
}) {
  let query = supabase
    .from("followup_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (searchParams.phone) {
    query = query.ilike("phone", `%${searchParams.phone}%`);
  }

  const dateParam = searchParams.date;

  // Garante que o filtro seja aplicado apenas se houver um período válido especificado
  if (dateParam && dateParam !== "todos" && dateParam !== "") {
    if (dateParam === "hoje") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("created_at", today.toISOString());
    } else if (dateParam === "7dias") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      query = query.gte("created_at", d.toISOString());
    } else if (typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      // Data específica: do início (00:00:00) ao fim do dia (23:59:59)
      const start = new Date(dateParam + "T00:00:00");
      const end = new Date(dateParam + "T23:59:59");
      query = query
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
    }
  }

  const { data: logs, error } = await query;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6">

        {/* ── Compact Header ──────────────────────────────────────────── */}
        <header className="mb-8 pb-6 border-b border-border/30">
          <div className="flex items-center gap-3 mb-2">
            <Send className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Follow-up <span className="text-primary">Timeline</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-8 leading-relaxed">
            Disparos automáticos do n8n para leads B2B
          </p>
        </header>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <FollowupFilters />

        {/* ── Results count ───────────────────────────────────────────── */}
        {!error && logs && logs.length > 0 && (
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-semibold">{logs.length}</span>{" "}
              {logs.length === 1 ? "registro encontrado" : "registros encontrados"}
            </p>
          </div>
        )}

        {/* ── States ──────────────────────────────────────────────────── */}
        {error ? (
          <div className="p-4 border border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">Erro ao carregar logs</h3>
              <p className="text-xs opacity-80 mt-0.5">{error.message}</p>
            </div>
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="border border-dashed border-border/50 py-16 flex flex-col items-center justify-center text-center bg-card/20">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-primary opacity-70" />
            </div>
            <h3 className="text-sm font-medium mb-1">Nenhum disparo encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tente ajustar os filtros ou selecionar outro período.
            </p>
          </div>
        ) : (
          /* ── Timeline ─────────────────────────────────────────────── */
          <div className="relative border-l border-border/30 ml-4 pl-8 pb-10 space-y-6">
            {logs.map((log: FollowupLog, index: number) => {
              const date = new Date(log.created_at);
              const isSent =
                log.status?.toLowerCase() === "enviado" ||
                log.status?.toLowerCase() === "sent" ||
                !log.status;

              return (
                <article key={log.id || index} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[37px] top-2.5 w-2.5 h-2.5 bg-primary ring-4 ring-background group-hover:scale-150 group-hover:shadow-[0_0_8px_rgba(93,194,32,0.7)] transition-all duration-200" />

                  {/* Timestamp */}
                  <time className="block text-xs text-primary font-mono mb-2 tracking-widest uppercase font-semibold">
                    {format(date, "dd MMM yyyy • HH:mm", { locale: ptBR })}
                  </time>

                  {/* Card */}
                  <div className="bg-card border border-border/25 hover:border-primary/40 transition-colors duration-200 relative overflow-hidden">
                    {/* Corner accent */}
                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-primary/8 to-transparent pointer-events-none" />

                    {/* Card header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-foreground uppercase tracking-wider">
                          {log.contact_name || "Contato"}
                        </span>
                        <span className="font-mono text-sm text-muted-foreground bg-muted/40 px-2 py-0.5">
                          {formatPhone(log.phone || log.telefone)}
                        </span>
                      </div>

                      {/* Status badge */}
                      {isSent ? (
                        <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-primary/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Enviado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-muted text-muted-foreground px-2.5 py-1 text-xs font-bold uppercase tracking-wider border border-border/40">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {log.status || "Pendente"}
                        </div>
                      )}
                    </div>

                    {/* Message body */}
                    <div className="px-5 py-4">
                      <p className="text-muted-foreground text-sm font-mono leading-relaxed whitespace-pre-wrap border-l-2 border-primary/30 pl-4">
                        {log.message_sent || log.message || log.mensagem || log.spintax || (
                          <span className="italic opacity-50">Mensagem não registrada.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
