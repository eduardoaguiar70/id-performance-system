"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface ItemConta {
  id: string;
  nome: string;
  grupo: string;
  erro?: string;
}

interface AccountPickerProps {
  contaId: string;
  label: string;
  vazio: string;
  selected: string | null;
  onSelected: (id: string) => void;
  carregar: (contaId: string) => Promise<ItemConta[]>;
  salvar: (contaId: string, id: string) => Promise<void>;
}

async function jsonOuErro(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao consultar o Google.");
  return data;
}

export const ga4Adapter = {
  carregar: async (contaId: string): Promise<ItemConta[]> => {
    const data = await jsonOuErro(await fetch(`/api/oauth/google/ga4/properties?conta_id=${encodeURIComponent(contaId)}`));
    return (data.propriedades as { id: string; nome: string; conta: string }[]).map((p) => ({
      id: p.id,
      nome: `${p.nome} (${p.id.replace("properties/", "")})`,
      grupo: p.conta,
    }));
  },
  salvar: async (contaId: string, id: string) => {
    await jsonOuErro(
      await fetch("/api/oauth/google/ga4/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: contaId, property_id: id }),
      })
    );
  },
};

export const googleAdsAdapter = {
  carregar: async (contaId: string): Promise<ItemConta[]> => {
    const data = await jsonOuErro(await fetch(`/api/oauth/google/ads/accounts?conta_id=${encodeURIComponent(contaId)}`));
    return data.contas as ItemConta[];
  },
  salvar: async (contaId: string, id: string) => {
    await jsonOuErro(
      await fetch("/api/oauth/google/ads/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: contaId, account_id: id }),
      })
    );
  },
};

export function AccountPicker({ contaId, label, vazio, selected, onSelected, carregar, salvar }: AccountPickerProps) {
  const [itens, setItens] = useState<ItemConta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    carregar(contaId)
      .then((r) => !cancelled && setItens(r))
      .catch((e: Error) => !cancelled && setErro(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [contaId, carregar]);

  const grupos = useMemo(() => {
    const m = new Map<string, ItemConta[]>();
    itens.forEach((i) => m.set(i.grupo, [...(m.get(i.grupo) ?? []), i]));
    return Array.from(m.entries());
  }, [itens]);

  const atual = itens.find((i) => i.id === selected);
  const bloqueados = itens.filter((i) => i.erro);
  const errosUnicos = Array.from(new Set(bloqueados.map((i) => i.erro)));

  const handleChange = async (id: string) => {
    setSaving(true);
    try {
      await salvar(contaId, id);
      onSelected(id);
      toast.success(`${label} vinculada ao cliente.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        {label}
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
      </label>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando no Google...
        </div>
      ) : erro ? (
        <div className="px-4 py-3 border border-red-500/20 bg-red-500/5 text-sm text-foreground/70">{erro}</div>
      ) : itens.length === 0 ? (
        <div className="px-4 py-3 border border-border text-sm text-muted-foreground">{vazio}</div>
      ) : (
        <>
          <select
            value={atual ? selected! : ""}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="w-full bg-background border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors rounded-none disabled:opacity-50"
          >
            <option value="" disabled>
              Selecione...
            </option>
            {grupos.map(([grupo, lista]) => (
              <optgroup key={grupo} label={grupo}>
                {lista.map((i) => (
                  <option key={i.id} value={i.id} disabled={!!i.erro}>
                    {i.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!atual && (
            <p className="text-[11px] text-yellow-400/80">
              Nada vinculado ainda. Os dados só serão coletados após a seleção.
            </p>
          )}
          {errosUnicos.length > 0 && (
            <div className="px-3 py-2 border border-yellow-500/20 bg-yellow-500/5 text-[11px] text-foreground/70 space-y-1">
              <p className="font-semibold text-yellow-400/90">
                {bloqueados.length} {bloqueados.length === 1 ? "conta indisponível" : "contas indisponíveis"}:
              </p>
              {errosUnicos.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
