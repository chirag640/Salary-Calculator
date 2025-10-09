"use client"

import { ExportManager } from "@/components/export-manager"
import { motion, fadeInUp, staggerContainer } from "@/components/motion"

export default function ExportPage() {
  return (
    <motion.div className="container mx-auto max-w-4xl" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeInUp} className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Export Data</h1>
        <p className="text-muted-foreground">Export your time entries in various formats</p>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <ExportManager />
      </motion.div>
    </motion.div>
  )
}
