import { Skeleton } from "@/components/ui/skeleton"

export default function ClientesLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-32" style={{ borderRadius: "2px" }} />
      </div>
      <Skeleton className="h-9 w-72" style={{ borderRadius: "2px" }} />
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
    </div>
  )
}
