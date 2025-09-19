"use client"

import { motion, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

export { motion, AnimatePresence }
