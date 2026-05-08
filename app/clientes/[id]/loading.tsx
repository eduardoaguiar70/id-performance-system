import { Skeleton } from "@/components/ui/skeleton"

export default function ClienteProfileLoading() {
  return (
    <div className="flex-1 p-8 pt-6">
      <div className="max-w-5xl space-y-5">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 flex-shrink-0" style={{ borderRadius: "2px" }} />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full" style={{ borderRadius: "2px" }} />
          <Skeleton className="h-44 w-full" style={{ borderRadius: "2px" }} />
        </div>
        <Skeleton className="h-36 w-full" style={{ borderRadius: "2px" }} />
        <Skeleton className="h-28 w-full" style={{ borderRadius: "2px" }} />
        <Skeleton className="h-48 w-full" style={{ borderRadius: "2px" }} />
      </div>
    </div>
  )
}
