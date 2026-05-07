import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata número de seguidores no formato compacto pt-BR
 * Ex: 15200 → "15,2 mil" | 1500000 → "1,5 mi"
 */
export function formatFollowers(count: number | null | undefined): string {
  if (!count && count !== 0) return "—"
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(count)
}

/**
 * Formata número de WhatsApp brasileiro
 * Ex: "5511944683337" → "+55 (11) 94468-3337"
 */
export function formatWhatsApp(phone: string | null | undefined): string {
  if (!phone) return "—"

  // Remove tudo que não é dígito
  const digits = phone.replace(/\D/g, "")

  // Formato: 55 + 11 + 9 dígitos (celular) ou 8 dígitos (fixo)
  if (digits.length === 13) {
    // +55 (XX) 9XXXX-XXXX
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12) {
    // +55 (XX) XXXX-XXXX
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  if (digits.length === 11) {
    // (XX) 9XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  // Retorna original se não bater em nenhum padrão
  return phone
}

/**
 * Formata data ISO para pt-BR
 * Ex: "2024-01-15T..." → "15/01/2024"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString("pt-BR")
}
