"use client"

// Magic UI NumberTicker (MIT, magicui.design), adapted: Indian digit grouping, and it jumps straight to the
// value when the user prefers reduced motion.
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react"

import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  delay?: number
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-IN")

export function NumberTicker({ value, startValue = 0, delay = 0, className, ...props }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const motionValue = useMotionValue(startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  useEffect(() => {
    if (!isInView) return
    if (reduce) {
      if (ref.current) ref.current.textContent = fmt(value)
      return
    }
    const timer = setTimeout(() => motionValue.set(value), delay * 1000)
    return () => clearTimeout(timer)
  }, [motionValue, isInView, delay, value, reduce])

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = fmt(latest)
      }),
    [springValue]
  )

  return (
    <span ref={ref} className={cn("inline-block num", className)} {...props}>
      {fmt(startValue)}
    </span>
  )
}
