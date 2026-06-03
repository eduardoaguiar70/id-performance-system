"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lead } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface EditLeadModalProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onUpdate: (updatedLead: Lead) => void
}

export function EditLeadModal({ lead, open, onClose, onUpdate }: EditLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    instagram_username: "",
    full_name: "",
    whatsapp: "",
    followers_count: 0,
    bio: "",
    external_url: "",
  })

  useEffect(() => {
    if (lead) {
      setFormData({
        instagram_username: lead.instagram_username || "",
        full_name: lead.full_name || "",
        whatsapp: lead.whatsapp || "",
        followers_count: lead.followers_count || 0,
        bio: lead.bio || "",
        external_url: lead.external_url || "",
      })
    }
  }, [lead])

  if (!lead) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "followers_count" ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from("leads")
      .update({
        instagram_username: formData.instagram_username,
        full_name: formData.full_name,
        whatsapp: formData.whatsapp,
        followers_count: formData.followers_count,
        bio: formData.bio,
        external_url: formData.external_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id)
      .select()
      .single()

    setLoading(false)

    if (error) {
      toast.error("Erro ao atualizar o lead.")
      console.error(error)
    } else if (data) {
      toast.success("Lead atualizado com sucesso!")
      onUpdate(data as Lead)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="instagram_username">Username (Instagram)</Label>
            <Input
              id="instagram_username"
              name="instagram_username"
              value={formData.instagram_username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followers_count">Seguidores</Label>
              <Input
                id="followers_count"
                name="followers_count"
                type="number"
                value={formData.followers_count}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="external_url">Link Externo</Label>
            <Input
              id="external_url"
              name="external_url"
              value={formData.external_url}
              onChange={handleChange}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
