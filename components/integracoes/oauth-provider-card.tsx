"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Link2, AlertTriangle, Circle } from "lucide-react";

export type OauthProvider = "google_ads" | "ga4" | "shopify";

type OauthStatus = "pendente" | "conectado" | "erro" | "revogado";

interface IntegracaoOauthRow {
  id: string;
  conta_id: string;
  provider: OauthProvider;
  account_identifier: string | null;
  status: OauthStatus;
  ultimo_erro: string | null;
}

interface OauthProviderCardProps {
  contaId: string;
  provider: OauthProvider;
  label: string;
  description: string;
  icon: React.ReactNode;
  accentColorClass: string; // ex: "bg-orange-500"
  authorizeUrl: (contaId: string, shop?: string) => string;
  requiresShopDomain?: boolean;
}

// ---------------------------------------------------------------------------
// Badge de status: "Não conectado" (cinza) | "Conectando..." (amarelo,
// estado local enquanto aguarda redirect/callback) | "Conectado" (verde) |
// "Erro na conexão" (vermelho)
// ---------------------------------------------------------------------------
function StatusBadge({
  status,
  connecting,
}: {
  status: OauthStatus | "nao_conectado";
  connecting: boolean;
}) {
  if (connecting) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest border border-yellow-500/40 bg-yellow-500/10 text-yellow-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Conectando...
      </span>
    );
  }

  if (status === "conectado") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest border border-green-500/40 bg-green-500/10 text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Conectado
      </span>
    );
  }

  if (status === "erro") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest border border-red-500/40 bg-red-500/10 text-red-400">
        <AlertTriangle className="w-3 h-3" />
        Erro na conexão
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-widest border border-border bg-muted/30 text-muted-foreground">
      <Circle className="w-1.5 h-1.5" />
      Não conectado
    </span>
  );
}

export function OauthProviderCard({
  contaId,
  provider,
  label,
  description,
  icon,
  accentColorClass,
  authorizeUrl,
  requiresShopDomain,
}: OauthProviderCardProps) {
  const [row, setRow] = useState<IntegracaoOauthRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [shopDomain, setShopDomain] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setConnecting(false);

    supabase
      .from("integracoes_oauth")
      .select("id, conta_id, provider, account_identifier, status, ultimo_erro")
      .eq("conta_id", contaId)
      .eq("provider", provider)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(`Erro ao buscar integração ${provider}:`, error);
        }
        setRow((data as IntegracaoOauthRow) ?? null);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contaId, provider]);

  const handleConnect = async () => {
    if (requiresShopDomain) {
      const trimmed = shopDomain.trim().toLowerCase();
      const shopifyDomainPattern = /^[a-z0-9-]+\.myshopify\.com$/;
      if (!shopifyDomainPattern.test(trimmed)) {
        toast.error("Informe um domínio válido, ex: minhaloja.myshopify.com");
        return;
      }
      setConnecting(true);
      try {
        const res = await fetch(authorizeUrl(contaId, trimmed));
        const data = await res.json().catch(() => null);
        if (res.status === 501) {
          toast.info(data?.message ?? "OAuth ainda não configurado");
        } else if (!res.ok) {
          toast.error(data?.message ?? "Não foi possível iniciar a conexão.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível iniciar a conexão.");
      } finally {
        setConnecting(false);
      }
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch(authorizeUrl(contaId));
      const data = await res.json().catch(() => null);
      if (res.status === 501) {
        toast.info(data?.message ?? "OAuth ainda não configurado");
      } else if (!res.ok) {
        toast.error(data?.message ?? "Não foi possível iniciar a conexão.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível iniciar a conexão.");
    } finally {
      setConnecting(false);
    }
  };

  const status: OauthStatus | "nao_conectado" = row?.status ?? "nao_conectado";
  const isConnected = status === "conectado";

  return (
    <div className="relative group flex flex-col border border-border/50 bg-card p-8 transition-colors hover:border-primary/50">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>

      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h2 className="text-2xl font-bold tracking-tight uppercase flex items-center gap-3">
            <span className={`w-3 h-3 block ${accentColorClass}`} />
            {label}
          </h2>
          {!isLoading && <StatusBadge status={status} connecting={connecting} />}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="relative z-10 flex flex-col gap-5 flex-1">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando status...
          </div>
        ) : (
          <>
            {isConnected && row?.account_identifier && (
              <div className="px-4 py-3 border border-green-500/20 bg-green-500/5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Conta conectada
                </p>
                <p className="text-sm text-foreground/80 font-mono break-all">
                  {row.account_identifier}
                </p>
              </div>
            )}

            {status === "erro" && row?.ultimo_erro && (
              <div className="px-4 py-3 border border-red-500/20 bg-red-500/5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-400/80 mb-1">
                  Último erro
                </p>
                <p className="text-sm text-foreground/70">{row.ultimo_erro}</p>
              </div>
            )}

            {requiresShopDomain && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Domínio da loja
                </label>
                <input
                  type="text"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="minhaloja.myshopify.com"
                  className="w-full bg-background border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/30 font-mono tracking-wider rounded-none"
                />
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="mt-auto group/btn relative flex items-center justify-center gap-2 border border-border px-6 py-3 font-bold uppercase tracking-widest text-sm transition-all hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {isConnected ? "Reconectar" : "Conectar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
