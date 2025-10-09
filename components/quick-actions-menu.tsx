"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  Play, 
  Calendar, 
  BarChart3, 
  Download,
  Clock,
  FileText
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface QuickActionsMenuProps {
  onStartTimer?: () => void
  onLogYesterday?: () => void
  onViewWeeklySummary?: () => void
  onQuickExport?: () => void
  className?: string
}

export function QuickActionsMenu({
  onStartTimer,
  onLogYesterday,
  onViewWeeklySummary,
  onQuickExport,
  className = ""
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const isMobile = useIsMobile()

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  // On mobile, show as floating action button
  if (isMobile) {
    return (
      <div className={`fixed bottom-24 right-4 z-40 ${className}`}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-12 w-12 rounded-full shadow-xl hover:shadow-2xl transition-shadow"
              aria-label="Quick actions"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 mb-2"
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs">Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {onStartTimer && (
              <DropdownMenuItem
                onClick={() => handleAction(onStartTimer)}
                className="gap-2 py-2.5"
              >
                <Play className="h-4 w-4" />
                <span className="text-sm">Start Timer</span>
              </DropdownMenuItem>
            )}
            
            {onLogYesterday && (
              <DropdownMenuItem
                onClick={() => handleAction(onLogYesterday)}
                className="gap-2 py-2.5"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Log Yesterday</span>
              </DropdownMenuItem>
            )}
            
            {onViewWeeklySummary && (
              <DropdownMenuItem
                onClick={() => handleAction(onViewWeeklySummary)}
                className="gap-2 py-2.5"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">This Week</span>
              </DropdownMenuItem>
            )}
            
            {onQuickExport && (
              <DropdownMenuItem
                onClick={() => handleAction(onQuickExport)}
                className="gap-2 py-2.5"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm">Export Data</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // On desktop, show as horizontal quick action buttons
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          <h3 className="w-full text-sm font-semibold text-muted-foreground mb-2">
            Quick Actions
          </h3>
          
          {onStartTimer && (
            <Button
              onClick={onStartTimer}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Start Timer
            </Button>
          )}
          
          {onLogYesterday && (
            <Button
              onClick={onLogYesterday}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Log Yesterday
            </Button>
          )}
          
          {onViewWeeklySummary && (
            <Button
              onClick={onViewWeeklySummary}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              This Week
            </Button>
          )}
          
          {onQuickExport && (
            <Button
              onClick={onQuickExport}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
