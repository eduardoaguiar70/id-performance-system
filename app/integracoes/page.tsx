"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Server, Save, Search } from "lucide-react";

interface IntegracaoConfig {
  id?: number;
  google_customer_id: string;
  google_developer_token: string;
}

export default function IntegracoesPage() {
  const [config, setConfig] = useState<IntegracaoConfig>({
    google_customer_id: "",
    google_developer_token: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configId, setConfigId] = useState<number | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("configuracoes_integracoes")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is the "no rows returned" error, which is fine if empty
        console.error("Erro ao buscar integrações:", error);
        toast.error("Não foi possível carregar as configurações.");
      }

      if (data) {
        setConfigId(data.id);
        setConfig({
          google_customer_id: data.google_customer_id || "",
          google_developer_token: data.google_developer_token || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const payload = {
        google_customer_id: config.google_customer_id,
        google_developer_token: config.google_developer_token,
        ...(configId ? { id: configId } : {}),
      };

      const { data, error } = await supabase
        .from("configuracoes_integracoes")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setConfigId(data.id);
      }

      toast.success("Integrações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar integrações:", error);
      toast.error("Ocorreu um erro ao salvar as credenciais.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof IntegracaoConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      {/* HEADER: Sharp geometry, massive typography */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase text-foreground">
            Integrações <span className="text-primary">N8N</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm font-medium">
            Gerencie as credenciais das plataformas de anúncios. Estas chaves são utilizadas pelo motor de automação (n8n) para sincronizar leads e campanhas.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="group relative flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 font-bold uppercase tracking-widest text-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin relative z-10" />
          ) : (
            <Save className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
          )}
          <span className="relative z-10">Salvar Alterações</span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform ease-out duration-300" />
        </button>
      </div>

      {/* GRID: 2 columns, sharp borders, minimal padding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BLOCO META ADS — Gerenciado via backend */}
        <div className="relative group flex flex-col border border-green-500/30 bg-card p-8 transition-colors hover:border-green-500/50">
          {/* Ícone de fundo decorativo */}
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Server className="w-24 h-24 text-green-500" />
          </div>

          {/* Header */}
          <div className="relative z-10 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <h2 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
                <span className="w-3 h-3 bg-blue-500 block" />
                Meta Ads
              </h2>
              {/* Badge de status */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest border border-green-500/40 bg-green-500/10 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Sistema Conectado
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Integração via System User &amp; Graph API</p>
          </div>

          {/* Corpo informativo */}
          <div className="relative z-10 flex flex-col gap-5 flex-1">
            {/* Descrição principal */}
            <div className="px-4 py-4 border border-green-500/20 bg-green-500/5">
              <p className="text-sm text-foreground/80 leading-relaxed">
                Integração ativa via API de Agência. As métricas estão sendo coletadas automaticamente da conta global.
              </p>
            </div>

            {/* Detalhes técnicos */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Método</p>
                  <p className="text-sm text-foreground/70 font-mono">System User Token · Graph API v21</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coleta</p>
                  <p className="text-sm text-foreground/70">Automática · Gerenciada pelo motor n8n</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escopo</p>
                  <p className="text-sm text-foreground/70">Conta global da agência · Todos os clientes</p>
                </div>
              </div>
            </div>

            {/* Nota de rodapé */}
            <p className="text-[11px] text-muted-foreground/50 mt-auto pt-4 border-t border-border/30">
              Credenciais gerenciadas exclusivamente no backend. Nenhuma configuração manual é necessária.
            </p>
          </div>
        </div>


        {/* BLOCO GOOGLE ADS */}
        <div className="relative group flex flex-col border border-border/50 bg-card p-8 transition-colors hover:border-primary/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Search className="w-24 h-24" />
          </div>
          
          <div className="relative z-10 mb-8">
            <h2 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
              <span className="w-3 h-3 bg-orange-500 block" />
              Google Ads
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Configuração de acesso via Google API</p>
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ID do Cliente (Customer ID)
              </label>
              <input
                type="text"
                value={config.google_customer_id}
                onChange={(e) => handleChange("google_customer_id", e.target.value)}
                placeholder="123-456-7890"
                className="w-full bg-background border border-border px-4 py-3 text-sm outline-none focus:border-orange-500 transition-colors placeholder:text-muted-foreground/30 font-mono tracking-wider rounded-none"
              />
              <p className="text-[11px] text-muted-foreground/70">Pode conter traços. Ex: 123-456-7890 ou 1234567890</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                Developer Token
                <span className="text-[10px] text-orange-500/80">Obrigatório</span>
              </label>
              <input
                type="password"
                value={config.google_developer_token}
                onChange={(e) => handleChange("google_developer_token", e.target.value)}
                placeholder="Insira o Developer Token"
                className="w-full bg-background border border-border px-4 py-3 text-sm outline-none focus:border-orange-500 transition-colors placeholder:text-muted-foreground/30 font-mono rounded-none"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
