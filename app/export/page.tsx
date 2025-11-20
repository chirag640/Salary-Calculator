"use client"

import { ExportManager } from "@/components/export-manager"
import { MotionProvider, Motion, LazyAnimatePresence, fadeInUp, staggerContainer } from "@/components/motion"

export default function ExportPage() {
  return (
    <MotionProvider>
    <Motion>
    <div className="container mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Export Data</h1>
        <p className="text-muted-foreground">Export your time entries in various formats</p>
      </div>

      <div>
        <ExportManager />
      </div>
    </div>
    </Motion>
    </MotionProvider>
  )
}
