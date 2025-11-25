"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface MobileNavItem {
  href: string;
  label: string;
}

interface MobileNavProps {
  items: MobileNavItem[];
}

/**
 * MobileNav
 * - Fully typed
 * - Animates bottom navigation for mobile
 * - Accepts an array of { href, label }
 * - Uses Neural Glass UI style
 */
const MobileNav: React.FC<MobileNavProps> = ({ items }) => {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="
        fixed bottom-4 left-1/2 -translate-x-1/2
        flex gap-4 px-6 py-3
        backdrop-blur-xl bg-white/10 border border-white/20 
        rounded-2xl shadow-xl md:hidden
      "
    >
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="px-3 py-1 text-sm text-white/90 hover:text-white"
        >
          {i.label}
        </Link>
      ))}
    </motion.div>
  );
};

export default MobileNav;
