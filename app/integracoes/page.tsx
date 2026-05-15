"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Server, Save, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegracaoConfig {
  id?: number;
  meta_access_token: string;
  meta_ad_account_id: string;
  google_customer_id: string;
  google_developer_token: string;
}

export default function IntegracoesPage() {
  const [config, setConfig] = useState<IntegracaoConfig>({
    meta_access_token: "",
    meta_ad_account_id: "",
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
          meta_access_token: data.meta_access_token || "",
          meta_ad_account_id: data.meta_ad_account_id || "",
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
        meta_access_token: config.meta_access_token,
        meta_ad_account_id: config.meta_ad_account_id,
        google_customer_id: config.google_customer_id,
        google_developer_token: config.google_developer_token,
        ...(configId ? { id: configId } : {}), // only send ID if it exists for update
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
        
        {/* BLOCO META ADS */}
        <div className="relative group flex flex-col border border-border/50 bg-card p-8 transition-colors hover:border-primary/50">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Server className="w-24 h-24" />
          </div>
          
          <div className="relative z-10 mb-8">
            <h2 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
              <span className="w-3 h-3 bg-blue-500 block" />
              Meta Ads
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Configuração de acesso via Graph API</p>
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                Token de Acesso (Access Token)
                <span className="text-[10px] text-blue-500/80">Obrigatório</span>
              </label>
              <input
                type="password"
                value={config.meta_access_token}
                onChange={(e) => handleChange("meta_access_token", e.target.value)}
                placeholder="EAAI..."
                className="w-full bg-background border border-border px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-muted-foreground/30 font-mono rounded-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ID da Conta de Anúncios
              </label>
              <input
                type="text"
                value={config.meta_ad_account_id}
                onChange={(e) => handleChange("meta_ad_account_id", e.target.value)}
                placeholder="act_123456789"
                className="w-full bg-background border border-border px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-muted-foreground/30 font-mono rounded-none"
              />
              <p className="text-[11px] text-muted-foreground/70">Prefixo 'act_' é opcional, mas recomendado.</p>
            </div>
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
