import { Skeleton } from "@/components/ui/skeleton"

export default function ScraperLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-32 w-full" style={{ borderRadius: "2px" }} />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
    </div>
  )
}
