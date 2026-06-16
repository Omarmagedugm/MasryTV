import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

interface ScoreSelectorProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
}

export default function ScoreSelector({ value, onChange, label, min = 0, max = 15 }: ScoreSelectorProps) {
  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>}
      <div className="flex flex-col items-center gap-1 group">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); increment(); }}
          className="h-8 w-8 flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white rounded-xl text-slate-500 transition-all shadow-sm"
        >
          <ChevronUp size={18} strokeWidth={3} />
        </motion.button>
        
        <div className="w-18 h-18 bg-white dark:bg-card-dark border-2 border-slate-100 dark:border-white/5 rounded-3xl flex items-center justify-center text-3xl font-black text-slate-900 dark:text-white shadow-xl group-hover:border-primary/40 transition-colors">
          {value}
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); decrement(); }}
          className="h-8 w-8 flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white rounded-xl text-slate-500 transition-all shadow-sm"
        >
          <ChevronDown size={18} strokeWidth={3} />
        </motion.button>
      </div>
    </div>
  );
}
