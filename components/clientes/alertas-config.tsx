"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Megaphone, TrendingUp, Bell, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AlertasConfigProps {
  clienteId: string
}

export function AlertasConfig({ clienteId }: AlertasConfigProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasData, setHasData] = useState(false)

  const [formData, setFormData] = useState({
    meta_cpa_maximo: "",
    meta_roas_minimo: "",
    google_cpa_maximo: "",
    google_roas_minimo: "",
    alerta_orcamento_diario_percentual: "90",
    whatsapp_alerta_numero: "",
  })

  useEffect(() => {
    async function loadConfig() {
      try {
        const { data, error } = await supabase
          .from("configuracoes_alertas")
          .select("*")
          .eq("cliente_id", clienteId)
          .single()

        if (error && error.code !== "PGRST116") {
          throw error
        }

        if (data) {
          setHasData(true)
          setFormData({
            meta_cpa_maximo: data.meta_cpa_maximo?.toString() || "",
            meta_roas_minimo: data.meta_roas_minimo?.toString() || "",
            google_cpa_maximo: data.google_cpa_maximo?.toString() || "",
            google_roas_minimo: data.google_roas_minimo?.toString() || "",
            alerta_orcamento_diario_percentual: data.alerta_orcamento_diario_percentual?.toString() || "90",
            whatsapp_alerta_numero: data.whatsapp_alerta_numero || "",
          })
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de alertas:", err)
        toast.error("Não foi possível carregar as configurações de alertas.")
      } finally {
        setLoading(false)
      }
    }

    if (clienteId) {
      loadConfig()
    }
  }, [clienteId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // For numeric fields, allow typing decimals (like "10." or "10.5")
    if (name !== "whatsapp_alerta_numero") {
      // Basic validation to allow numbers, dot, and comma
      if (value !== "" && !/^[0-9.,]*$/.test(value)) return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    const toastId = toast.loading("Salvando configurações de alertas...")

    try {
      // Helper to parse numeric values safely (handles commas as dots)
      const parseNum = (val: string) => {
        if (!val) return null
        const parsed = parseFloat(val.replace(",", "."))
        return isNaN(parsed) ? null : parsed
      }

      const parseIntVal = (val: string) => {
        if (!val) return null
        const parsed = parseInt(val, 10)
        return isNaN(parsed) ? null : parsed
      }

      const payload = {
        cliente_id: clienteId,
        meta_cpa_maximo: parseNum(formData.meta_cpa_maximo),
        meta_roas_minimo: parseNum(formData.meta_roas_minimo),
        google_cpa_maximo: parseNum(formData.google_cpa_maximo),
        google_roas_minimo: parseNum(formData.google_roas_minimo),
        alerta_orcamento_diario_percentual: parseIntVal(formData.alerta_orcamento_diario_percentual) ?? 90,
        whatsapp_alerta_numero: formData.whatsapp_alerta_numero.trim() || null,
      }

      let error
      
      if (hasData) {
        const { error: updateError } = await supabase
          .from("configuracoes_alertas")
          .update(payload)
          .eq("cliente_id", clienteId)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from("configuracoes_alertas")
          .insert([payload])
        error = insertError
      }

      if (error) throw error

      setHasData(true)
      toast.success("Configurações salvas com sucesso!", { id: toastId })
    } catch (err: any) {
      console.error("Erro ao salvar alertas:", err)
      toast.error(err.message || "Erro ao salvar as configurações.", { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Bloco Meta Ads */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-blue-500" />
            Meta Ads
          </CardTitle>
          <CardDescription className="text-xs">
            Limites de performance para alertas no Meta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meta_cpa_maximo" className="text-xs uppercase tracking-wider text-muted-foreground">CPA Máximo (R$)</Label>
            <Input
              id="meta_cpa_maximo"
              name="meta_cpa_maximo"
              placeholder="Ex: 50.00"
              value={formData.meta_cpa_maximo}
              onChange={handleChange}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meta_roas_minimo" className="text-xs uppercase tracking-wider text-muted-foreground">ROAS Mínimo</Label>
            <Input
              id="meta_roas_minimo"
              name="meta_roas_minimo"
              placeholder="Ex: 3.5"
              value={formData.meta_roas_minimo}
              onChange={handleChange}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bloco Google Ads */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Google Ads
          </CardTitle>
          <CardDescription className="text-xs">
            Limites de performance para alertas no Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="google_cpa_maximo" className="text-xs uppercase tracking-wider text-muted-foreground">CPA Máximo (R$)</Label>
            <Input
              id="google_cpa_maximo"
              name="google_cpa_maximo"
              placeholder="Ex: 80.00"
              value={formData.google_cpa_maximo}
              onChange={handleChange}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="google_roas_minimo" className="text-xs uppercase tracking-wider text-muted-foreground">ROAS Mínimo</Label>
            <Input
              id="google_roas_minimo"
              name="google_roas_minimo"
              placeholder="Ex: 2.0"
              value={formData.google_roas_minimo}
              onChange={handleChange}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bloco Geral & Notificações */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Geral & Notificações
          </CardTitle>
          <CardDescription className="text-xs">
            Orçamento e número para disparo de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alerta_orcamento_diario_percentual" className="text-xs uppercase tracking-wider text-muted-foreground">Alerta Orçamento Diário (%)</Label>
            <Input
              id="alerta_orcamento_diario_percentual"
              name="alerta_orcamento_diario_percentual"
              placeholder="Ex: 90"
              value={formData.alerta_orcamento_diario_percentual}
              onChange={handleChange}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_alerta_numero" className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp p/ Alertas</Label>
            <Input
              id="whatsapp_alerta_numero"
              name="whatsapp_alerta_numero"
              placeholder="Ex: 5511999999999"
              value={formData.whatsapp_alerta_numero}
              onChange={handleChange}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end mt-2">
        <Button onClick={handleSave} disabled={saving} className="min-w-[150px]">
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            <><Check className="mr-2 h-4 w-4" /> Salvar Configurações</>
          )}
        </Button>
      </div>
    </div>
  )
}
