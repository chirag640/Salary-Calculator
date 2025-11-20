"use client"

import * as React from "react"
import type { Variants } from "framer-motion"

// Animation variants (kept as POJOs so they can be used with real framer-motion
// when it loads, or used as hints for CSS fallbacks).
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

// Lightweight runtime lazy loader for framer-motion. This avoids pulling the
// full framer-motion bundle into the initial client JS for pages that don't
// immediately animate.

type MotionModule = typeof import("framer-motion")

const MotionContext = React.createContext<MotionModule | null>(null)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [mod, setMod] = React.useState<MotionModule | null>(null)

  React.useEffect(() => {
    let mounted = true
    import("framer-motion").then((m) => {
      if (mounted) setMod(m)
    }).catch(() => {
      // ignore; keep null to use no-op fallbacks
    })
    return () => { mounted = false }
  }, [])

  return <MotionContext.Provider value={mod}>{children}</MotionContext.Provider>
}

// Proxy Motion component: if framer-motion is loaded, return real `motion`.
// Otherwise, return a no-op object with `div`-like components that simply render
// children (so animation props are ignored).
function useMotionProxy() {
  const mod = React.useContext(MotionContext)
  if (mod) return mod.motion

  // Minimal no-op motion-like API used by the app (only common variants/props used).
  const noOp: any = new Proxy(
    {},
    {
      get: (_, prop) => {
        // return a functional component that forwards children
        return ({ children, ...rest }: any) => React.createElement("div", rest, children)
      },
    },
  )

  return noOp
}

export function Motion({ children }: { children: React.ReactNode }) {
  const motion = useMotionProxy()
  // Render children inside a motion.div if available (no-op fallback works too)
  const MotionDiv = motion.div || (({ children }: any) => <div>{children}</div>)
  return <MotionDiv>{children}</MotionDiv>
}

export function LazyAnimatePresence({ children }: { children: React.ReactNode }) {
  const mod = React.useContext(MotionContext)
  if (mod && mod.AnimatePresence) {
    const AP = mod.AnimatePresence
    return <AP>{children}</AP>
  }
  // fallback: render children directly
  return <>{children}</>
}

// Expose helpers similar to previous named exports for convenience. Consumers
// can import { MotionProvider, Motion, LazyAnimatePresence, fadeInUp } and
// wrap pages with <MotionProvider> to enable real framer-motion loading.

