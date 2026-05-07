import { AlertCircle, TrendingDown, Clock } from "lucide-react"

export function RecentAlerts() {
  const alerts = [
    {
      title: "Campanha Black Friday com CPC alto",
      description: "O CPC passou de R$ 5,00 para R$ 8,50 nas últimas 2h.",
      icon: TrendingDown,
      color: "text-red-500",
      time: "2 horas atrás",
    },
    {
      title: "Falha no webhook n8n",
      description: "O disparo de approaches falhou para 15 leads.",
      icon: AlertCircle,
      color: "text-orange-500",
      time: "4 horas atrás",
    },
    {
      title: "Orçamento quase esgotado",
      description: "Campanha 'Retargeting IG' atingiu 90% do orçamento diário.",
      icon: Clock,
      color: "text-yellow-500",
      time: "5 horas atrás",
    },
  ]

  return (
    <div className="space-y-8">
      {alerts.map((alert, index) => (
        <div key={index} className="flex items-center">
          <div className={`mr-4 h-9 w-9 rounded-full bg-muted flex items-center justify-center ${alert.color}`}>
            <alert.icon className="h-5 w-5" />
          </div>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{alert.title}</p>
            <p className="text-sm text-muted-foreground">
              {alert.description}
            </p>
          </div>
          <div className="ml-auto font-medium text-xs text-muted-foreground">
            {alert.time}
          </div>
        </div>
      ))}
    </div>
  )
}
