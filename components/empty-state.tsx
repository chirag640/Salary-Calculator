"use client";

import { type ReactNode } from "react";
import {
  FileQuestion,
  Clock,
  Calendar,
  Search,
  FolderOpen,
  Users,
  BarChart3,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

/**
 * Empty State Component
 *
 * Displays a friendly message when there's no data to show,
 * with optional actions to help users get started.
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
}: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-lg font-semibold">{title}</h3>

      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick}>
              <ActionIcon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases

export function NoTimeEntriesState({
  onAddEntry,
  className,
}: {
  onAddEntry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Clock}
      title="No time entries yet"
      description="Start tracking your work time to see your progress and earnings here."
      action={
        onAddEntry
          ? {
              label: "Add Time Entry",
              onClick: onAddEntry,
              icon: Plus,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoEntriesForDateState({
  date,
  onAddEntry,
  className,
}: {
  date?: string;
  onAddEntry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Calendar}
      title={date ? `No entries for ${date}` : "No entries for this date"}
      description="You haven't logged any time for this day. Add an entry to track your work."
      action={
        onAddEntry
          ? {
              label: "Add Entry",
              onClick: onAddEntry,
              icon: Plus,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoSearchResultsState({
  query,
  onClearSearch,
  className,
}: {
  query?: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}". Try a different search term.`
          : "No matching results found. Try adjusting your search or filters."
      }
      action={
        onClearSearch
          ? {
              label: "Clear Search",
              onClick: onClearSearch,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoProjectsState({
  onAddProject,
  className,
}: {
  onAddProject?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects yet"
      description="Organize your work by creating projects. Projects help you track time across different tasks."
      action={
        onAddProject
          ? {
              label: "Create Project",
              onClick: onAddProject,
              icon: Plus,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoClientsState({
  onAddClient,
  className,
}: {
  onAddClient?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Users}
      title="No clients yet"
      description="Add clients to organize your work and generate client-specific reports."
      action={
        onAddClient
          ? {
              label: "Add Client",
              onClick: onAddClient,
              icon: Plus,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoReportsState({
  onGenerateReport,
  className,
}: {
  onGenerateReport?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No report data"
      description="There's not enough data to generate a report for the selected period."
      action={
        onGenerateReport
          ? {
              label: "Adjust Filters",
              onClick: onGenerateReport,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoSalaryHistoryState({
  onSetupSalary,
  className,
}: {
  onSetupSalary?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={BarChart3}
      title="No salary history"
      description="Set up your salary to start tracking your earnings and generate payslips."
      action={
        onSetupSalary
          ? {
              label: "Set Up Salary",
              onClick: onSetupSalary,
              icon: Plus,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoNotificationsState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
      className={className}
    />
  );
}

export function GenericEmptyState({
  resourceName = "items",
  onAdd,
  className,
}: {
  resourceName?: string;
  onAdd?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={`No ${resourceName}`}
      description={`There are no ${resourceName} to display.`}
      action={
        onAdd
          ? {
              label: `Add ${resourceName.slice(0, -1) || resourceName}`,
              onClick: onAdd,
              icon: Plus,
            }
          : undefined
      }
      className={className}
    />
  );
}

export default EmptyState;
