import { Skeleton } from "@/components/ui/skeleton"

export default function ReunioesLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-36" style={{ borderRadius: "2px" }} />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
    </div>
  )
}
