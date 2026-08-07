import React, { useRef, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'motion/react';

interface MonthSelectorProps {
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedDate, onMonthChange }) => {
  const months = Array.from({ length: 5 }, (_, i) => {
    return subMonths(selectedDate, 2 - i);
  });

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-card rounded-2xl border border-border shadow-sm mb-4 overflow-hidden relative">
      {months.map((date, i) => {
        const isSelected = i === 2;
        return (
          <button
            key={date.getTime()}
            onClick={() => onMonthChange(date)}
            className={`relative px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
              isSelected ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="month-indicator"
                className="absolute inset-0 bg-accent/10 rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">{format(date, 'MMMM yyyy', { locale: ar })}</span>
          </button>
        );
      })}
    </div>
  );
};
