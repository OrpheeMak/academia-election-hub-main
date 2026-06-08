// src/components/premium/GlassCard.tsx
// Composant réutilisable : Card avec effet glassmorphism
// Intégré Framer Motion pour animations fluides

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
  delay?: number;
}

export const GlassCard = React.memo<GlassCardProps>(
  ({ children, className, hover = true, gradient = false, onClick, delay = 0 }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay }}
        whileHover={hover ? { y: -4, scale: 1.01 } : {}}
        onClick={onClick}
        className={cn(
          // Base
          'relative rounded-xl p-5 backdrop-blur-md transition-all duration-300',

          // Verre + Border
          'bg-white/10 dark:bg-black/30 border border-white/20 dark:border-white/10',

          // Gradient optionnel
          gradient && 'bg-gradient-to-br from-white/20 to-white/5 dark:from-white/10 dark:to-black/40',

          // Hover + Cursor
          hover && 'hover:border-white/30 dark:hover:border-white/20 hover:cursor-pointer',

          // Custom
          className
        )}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
