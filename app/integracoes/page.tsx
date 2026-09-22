"use client";

import { Server, Search, BarChart3, ShoppingBag, Building2 } from "lucide-react";
import { useCliente } from "@/context/ClienteContext";
import { OauthProviderCard } from "@/components/integracoes/oauth-provider-card";

export default function IntegracoesPage() {
  const { clienteSelecionado } = useCliente();

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
      </div>

      {/* GRID: 2 columns, sharp borders, minimal padding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* BLOCO META ADS — Gerenciado via backend (NÃO MEXER) */}
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

        {/* BLOCOS OAUTH — dependem do cliente selecionado no header */}
        {!clienteSelecionado ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground border border-border/50 bg-card">
            <Building2 className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum cliente selecionado</p>
            <p className="text-sm mt-1">Use o seletor no topo para escolher um cliente</p>
          </div>
        ) : (
          <>
            <OauthProviderCard
              contaId={clienteSelecionado.conta_id}
              provider="google_ads"
              label="Google Ads"
              description="Conexão OAuth por cliente via Google Ads API"
              icon={<Search className="w-24 h-24" />}
              accentColorClass="bg-orange-500"
              authorizeUrl={(contaId) => `/api/oauth/google/authorize?provider=google_ads&conta_id=${encodeURIComponent(contaId)}`}
            />

            <OauthProviderCard
              contaId={clienteSelecionado.conta_id}
              provider="ga4"
              label="Google Analytics 4"
              description="Conexão OAuth por cliente via GA4 Data API"
              icon={<BarChart3 className="w-24 h-24" />}
              accentColorClass="bg-yellow-500"
              authorizeUrl={(contaId) => `/api/oauth/google/authorize?provider=ga4&conta_id=${encodeURIComponent(contaId)}`}
            />

            <OauthProviderCard
              contaId={clienteSelecionado.conta_id}
              provider="shopify"
              label="Shopify"
              description="Instalação do app Shopify por loja"
              icon={<ShoppingBag className="w-24 h-24" />}
              accentColorClass="bg-green-600"
              requiresShopDomain
              authorizeUrl={(contaId, shop) =>
                `/api/oauth/shopify/install?conta_id=${encodeURIComponent(contaId)}&shop=${encodeURIComponent(shop ?? "")}`
              }
            />
          </>
        )}

      </div>
    </div>
  );
}
