import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function AdminPlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Icon className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            Esta área será implementada nas próximas tarefas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
