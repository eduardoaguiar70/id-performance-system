import { supabase } from "@/lib/supabase";
import { FollowupFilters } from "./filters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, MessageSquare, AlertCircle } from "lucide-react";

interface FollowupLog {
  id?: string;
  created_at: string;
  phone?: string;
  telefone?: string;
  message?: string;
  mensagem?: string;
  spintax?: string;
  status?: string;
}

// Helper for phone masking
function formatPhone(phone?: string) {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
  } else if (cleaned.length === 10) {
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
    .order("created_at", { ascending: false });

  if (searchParams.phone) {
    query = query.ilike("phone", `%${searchParams.phone}%`);
  }

  if (searchParams.date === "hoje") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query = query.gte("created_at", today.toISOString());
  } else if (searchParams.date === "7dias") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    query = query.gte("created_at", d.toISOString());
  }

  const { data: logs, error } = await query;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-12 font-sans selection:bg-primary selection:text-primary-foreground">
      <div className="max-w-5xl mx-auto">
        <header className="mb-16">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter mb-4 text-balance">
            Follow-up <span className="text-primary">Timeline.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            Acompanhe o fluxo de disparos automáticos do n8n para os leads B2B em tempo real.
          </p>
        </header>

        <FollowupFilters />

        {error ? (
          <div className="p-6 border border-destructive/50 bg-destructive/10 text-destructive rounded-none flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold">Erro ao carregar logs</h3>
              <p className="text-sm opacity-90">{error.message}</p>
            </div>
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="border border-dashed border-border p-16 flex flex-col items-center justify-center text-center rounded-none bg-card/30">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <MessageSquare className="w-8 h-8 text-primary opacity-80" />
            </div>
            <h3 className="text-xl font-medium mb-2">Nenhum follow-up automático disparado ainda</h3>
            <p className="text-muted-foreground max-w-md text-balance">
              Não encontramos nenhum registro correspondente aos filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="relative border-l border-border/40 ml-4 sm:ml-8 pl-8 sm:pl-12 pb-12 space-y-16">
            {logs.map((log: FollowupLog, index: number) => {
              const date = new Date(log.created_at);
              const isSent = log.status?.toLowerCase() === "enviado" || log.status?.toLowerCase() === "sent" || !log.status; // Default to sent if status missing for demo

              return (
                <article key={log.id || index} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[37px] sm:-left-[53px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background shadow-[0_0_10px_rgba(93,194,32,0.5)] group-hover:scale-150 group-hover:shadow-[0_0_15px_rgba(93,194,32,0.8)] transition-all duration-300" />
                  
                  {/* Date & Time (Left offset in larger screens conceptually, but inline for brutalist stacking) */}
                  <time className="block text-sm text-primary font-mono mb-3 tracking-widest uppercase">
                    {format(date, "dd MMM yyyy • HH:mm", { locale: ptBR })}
                  </time>

                  {/* Card Content */}
                  <div className="bg-card border border-border/30 hover:border-primary/50 transition-colors duration-300 p-6 sm:p-8 rounded-none relative overflow-hidden">
                    {/* Abstract Corner Accent */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <div>
                        <h4 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">
                          {formatPhone(log.phone || log.telefone)}
                        </h4>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {isSent ? (
                          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 text-xs font-bold uppercase tracking-wider border border-primary/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Enviado
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-1 text-xs font-bold uppercase tracking-wider border border-border">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {log.status || "Pendente"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="relative">
                      <MessageSquare className="absolute -left-3 -top-3 w-8 h-8 text-muted/20 rotate-12" />
                      <div className="pl-5 border-l-2 border-primary/30">
                        <p className="text-muted-foreground text-sm sm:text-base whitespace-pre-wrap leading-relaxed font-mono">
                          {log.message || log.mensagem || log.spintax || "Mensagem não registrada."}
                        </p>
                      </div>
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
