"use client";

import { useState } from "react";
import { Building2, Construction, Loader2 } from "lucide-react";
import { useCliente } from "@/context/ClienteContext";
import { cn } from "@/lib/utils";
import { Ga4Tab } from "@/components/ecommerce/ga4-tab";
import { GoogleAdsTab } from "@/components/ecommerce/google-ads-tab";
import { MetaAdsTab } from "@/components/ecommerce/meta-ads-tab";
import { VisaoGeralTab } from "@/components/ecommerce/visao-geral-tab";

const ABAS = [
  { id: "visao_geral", label: "Visão Geral" },
  { id: "trafego", label: "Tráfego" },
  { id: "pedidos", label: "Pedidos" },
  { id: "produtos", label: "Produtos" },
  { id: "clientes", label: "Clientes" },
  { id: "financeiro", label: "Financeiro" },
  { id: "projecoes", label: "Projeções" },
] as const;

const SUBABAS_TRAFEGO = [
  { id: "meta", label: "Meta Ads" },
  { id: "google", label: "Google Ads" },
  { id: "tiktok", label: "TikTok Ads" },
  { id: "ga4", label: "GA4" },
] as const;

type Aba = (typeof ABAS)[number]["id"];
type SubAba = (typeof SUBABAS_TRAFEGO)[number]["id"];

function EmConstrucao({ nome }: { nome: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground border border-border/50 bg-card gap-2">
      <Construction className="h-10 w-10 opacity-30" />
      <p className="text-base font-medium">{nome}</p>
      <p className="text-sm">Em desenvolvimento.</p>
    </div>
  );
}

export default function EcommercePage() {
  const { clienteSelecionado, restaurandoCliente } = useCliente();
  const [aba, setAba] = useState<Aba>("visao_geral");
  const [subAba, setSubAba] = useState<SubAba>("ga4");

  const nomeAba = ABAS.find((a) => a.id === aba)!.label;
  const nomeSubAba = SUBABAS_TRAFEGO.find((s) => s.id === subAba)!.label;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="pb-4 border-b border-border/50">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase text-foreground">
          Dashboard <span className="text-primary">E-commerce</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {clienteSelecionado ? clienteSelecionado.conta_nome : "Selecione um cliente no topo da página"}
        </p>
      </div>

      {/* Abas principais */}
      <nav className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border/50" aria-label="Seções do dashboard">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            aria-current={aba === a.id ? "page" : undefined}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors",
              aba === a.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {a.label}
          </button>
        ))}
      </nav>

      {restaurandoCliente ? (
        <div className="flex items-center justify-center min-h-[400px] text-muted-foreground gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando cliente...
        </div>
      ) : !clienteSelecionado ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground border border-border/50 bg-card">
          <Building2 className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum cliente selecionado</p>
          <p className="text-sm mt-1">Use o seletor no topo para escolher um cliente</p>
        </div>
      ) : aba === "visao_geral" ? (
        <VisaoGeralTab key={clienteSelecionado.conta_id} contaId={clienteSelecionado.conta_id} />
      ) : aba !== "trafego" ? (
        <EmConstrucao nome={nomeAba} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Sub-abas de Tráfego */}
          <div className="flex gap-1" role="tablist" aria-label="Canais de tráfego">
            {SUBABAS_TRAFEGO.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={subAba === s.id}
                onClick={() => setSubAba(s.id)}
                className={cn(
                  "px-4 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors",
                  subAba === s.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {subAba === "ga4" ? (
            <Ga4Tab key={clienteSelecionado.conta_id} contaId={clienteSelecionado.conta_id} />
          ) : subAba === "meta" ? (
            <MetaAdsTab key={clienteSelecionado.conta_id} contaId={clienteSelecionado.conta_id} />
          ) : subAba === "google" ? (
            <GoogleAdsTab key={clienteSelecionado.conta_id} contaId={clienteSelecionado.conta_id} />
          ) : (
            <EmConstrucao nome={nomeSubAba} />
          )}
        </div>
      )}
    </div>
  );
}
