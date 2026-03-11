"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CurtainWipeProps {
  children: ReactNode;
}

export function CurtainWipe({ children }: CurtainWipeProps) {
  return (
    <motion.div
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      animate={{ clipPath: "inset(0% 0 0 0)" }}
      exit={{ clipPath: "inset(0 0 100% 0)" }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
