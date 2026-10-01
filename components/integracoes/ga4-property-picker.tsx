"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Ga4Property {
  id: string;
  nome: string;
  conta: string;
}

interface Ga4PropertyPickerProps {
  contaId: string;
  selected: string | null;
  onSelected: (propertyId: string) => void;
}

export function Ga4PropertyPicker({ contaId, selected, onSelected }: Ga4PropertyPickerProps) {
  const [propriedades, setPropriedades] = useState<Ga4Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    fetch(`/api/oauth/google/ga4/properties?conta_id=${encodeURIComponent(contaId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) setErro(data.message ?? "Erro ao listar propriedades.");
        else setPropriedades(data.propriedades ?? []);
      })
      .catch(() => !cancelled && setErro("Erro ao listar propriedades."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [contaId]);

  const porConta = useMemo(() => {
    const grupos = new Map<string, Ga4Property[]>();
    propriedades.forEach((p) => grupos.set(p.conta, [...(grupos.get(p.conta) ?? []), p]));
    return Array.from(grupos.entries());
  }, [propriedades]);

  const handleChange = async (propertyId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/oauth/google/ga4/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: contaId, property_id: propertyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Erro ao salvar propriedade.");
      onSelected(propertyId);
      toast.success("Propriedade GA4 vinculada ao cliente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar propriedade.");
    } finally {
      setSaving(false);
    }
  };

  const atual = propriedades.find((p) => p.id === selected);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        Propriedade GA4
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
      </label>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Buscando propriedades no Google...
        </div>
      ) : erro ? (
        <div className="px-4 py-3 border border-red-500/20 bg-red-500/5 text-sm text-foreground/70">{erro}</div>
      ) : propriedades.length === 0 ? (
        <div className="px-4 py-3 border border-border text-sm text-muted-foreground">
          Este login não tem acesso a nenhuma propriedade GA4.
        </div>
      ) : (
        <>
          <select
            value={selected && atual ? selected : ""}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="w-full bg-background border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors rounded-none disabled:opacity-50"
          >
            <option value="" disabled>
              Selecione a propriedade...
            </option>
            {porConta.map(([conta, props]) => (
              <optgroup key={conta} label={conta}>
                {props.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.id.replace("properties/", "")})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!atual && (
            <p className="text-[11px] text-yellow-400/80">
              Nenhuma propriedade vinculada. Os dados do GA4 só serão coletados após a seleção.
            </p>
          )}
        </>
      )}
    </div>
  );
}
