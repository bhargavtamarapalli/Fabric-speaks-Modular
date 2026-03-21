"use client";

import { motion } from "framer-motion";

interface SpiderLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
}

/**
 * A custom animated loader component that looks like a spider.
 * Used for high-level loading states across the application.
 */
export function SpiderLoader({ size = "md", color = "currentColor" }: SpiderLoaderProps) {
  const sizeMap = { sm: 16, md: 32, lg: 64, xl: 128 };
  const d = sizeMap[size];

  return (
    <motion.div
      className="inline-flex items-center justify-center spider-loader"
      style={{ width: d, height: d, color }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
      aria-label="Loading"
      role="status"
    >
      <svg
        width={d}
        height={d}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        {/* Legs moving */}
        <motion.path
          d="M12 9v-4"
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        <motion.path
          d="M12 15v4"
          animate={{ y: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
        />
        <motion.path
          d="M9 12h-4"
          animate={{ x: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.25 }}
        />
        <motion.path
          d="M15 12h4"
          animate={{ x: [0, 2, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.75 }}
        />
        {/* Diagonals */}
        <motion.path
          d="M9.88 9.88l-2.83-2.83"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.1 }}
        />
        <motion.path
          d="M14.12 14.12l2.83 2.83"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.6 }}
        />
        <motion.path
          d="M9.88 14.12l-2.83 2.83"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
        />
        <motion.path
          d="M14.12 9.88l2.83-2.83"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.9 }}
        />
      </svg>
    </motion.div>
  );
}
