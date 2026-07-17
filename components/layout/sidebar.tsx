"use client"

import { memo, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Image as ImageIcon,
  Megaphone,
  TrendingUp,
  MessageSquare,
  CheckSquare,
  ScanSearch,
  Bot,
  LogOut,
  Building2,
  Heart,
  Settings,
  Send,
  GitMerge,
  ScrollText,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { supabaseAuth } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Navigation groups
// ---------------------------------------------------------------------------
interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  label: string | null   // null = no header (top-level standalone)
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    label: null,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Agente ID",
    items: [
      { name: "Agente ID", href: "/insights", icon: Bot },
    ],
  },
  {
    label: "Gestão",
    items: [
      { name: "Clientes",          href: "/clientes",          icon: Building2 },
      { name: "Customer Success",  href: "/customer-success",  icon: Heart },
    ],
  },
  {
    label: "Comercial",
    items: [
      { name: "Leads",              href: "/leads",         icon: Users },
      { name: "Follow-ups",          href: "/followup-logs", icon: Send },
      { name: "Flow Builder",         href: "/flow-builder",  icon: GitMerge },
      { name: "Scraper",              href: "/scraper",       icon: ScanSearch },
    ],
  },
  {
    label: "Analytics & ADS",
    items: [
      { name: "Campanhas", href: "/campanhas", icon: Megaphone },
      { name: "KPIs",      href: "/kpis",      icon: TrendingUp },
    ],
  },
  {
    label: "Organização",
    items: [
      { name: "Reuniões", href: "/reunioes", icon: MessageSquare },
      { name: "Tarefas",  href: "/tarefas",  icon: CheckSquare },
    ],
  },
  {
    label: "Utilidades",
    items: [
      { name: "Criativos", href: "/criativos", icon: ImageIcon },
    ],
  },
  {
    label: "Configurações",
    items: [
      { name: "Integrações", href: "/integracoes", icon: Settings },
    ],
  },
]

// ---------------------------------------------------------------------------
function SidebarComponent() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    await supabaseAuth.auth.signOut()
    document.cookie = "sb-auth-token=; path=/; max-age=0"
    router.push("/login")
    router.refresh()
  }, [router])

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card text-card-foreground">

      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div className="flex h-16 items-center px-6 border-b border-border flex-shrink-0">
        <Image
          src="/id-logo-horizontal.png"
          alt="ID Performance Digital"
          width={320}
          height={80}
          priority
          className="h-11 w-auto object-contain"
        />
      </div>

      {/* ── Nav groups ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "pt-3" : ""}>

            {/* Section label */}
            {group.label && (
              <div className="px-3 pb-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
                  {group.label}
                </span>
              </div>
            )}

            {/* Items */}
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-4 w-4 flex-shrink-0",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-secondary-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div className="border-t border-border p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-medium flex-shrink-0">
            ID
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium truncate">ID Performance</span>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export const Sidebar = memo(SidebarComponent)
