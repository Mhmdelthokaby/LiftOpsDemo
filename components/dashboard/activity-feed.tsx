import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, Wrench, Package, Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityItemDto } from "@/lib/api"
import { formatDistanceToNow } from "date-fns" // Assuming we can use this or native Date, I'll use native to avoid dep check
import { formatDate } from "@/lib/utils"

interface ActivityFeedProps {
  activities?: ActivityItemDto[];
}

const getIcon = (type: string) => {
  switch (type) {
    case "completion": return CheckCircle2;
    case "emergency": return AlertTriangle;
    case "maintenance": return Wrench;
    case "inventory": return Package;
    default: return Clock;
  }
}

const getIconColor = (type: string) => {
  switch (type) {
    case "completion": return "text-green-500"; // Assuming Tailwind colors
    case "emergency": return "text-red-500";
    case "maintenance": return "text-blue-500";
    case "inventory": return "text-yellow-500";
    default: return "text-muted-foreground";
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates across all operations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {activities?.map((activity) => {
              const Icon = getIcon(activity.type);
              const timeAgo = formatDate(activity.timestamp) + " " + new Date(activity.timestamp).toLocaleTimeString(); // Simple formatting

              return (
                <div key={activity.id} className="flex gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted ${getIconColor(activity.type)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{activity.title}</p>
                      {activity.badge && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {activity.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                </div>
              )
            })}
            {(!activities || activities.length === 0) && (
              <div className="text-center text-muted-foreground">No recent activity.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
