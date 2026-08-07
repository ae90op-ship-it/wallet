import React, { useRef, useEffect } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'motion/react';

interface DaySelectorProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({ currentDate, selectedDate, onDateSelect }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const daysInMonth = getDaysInMonth(currentDate);
  const start = startOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(start, i));

  // Auto-scroll to selected date on mount or when selectedDate changes
  useEffect(() => {
    if (scrollRef.current) {
      const selectedIndex = selectedDate.getDate() - 1;
      const element = scrollRef.current.children[selectedIndex] as HTMLElement;
      if (element) {
        const scrollLeft = element.offsetLeft - scrollRef.current.clientWidth / 2 + element.clientWidth / 2;
        scrollRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedDate]);

  return (
    <div className="flex overflow-x-auto gap-3 py-2 px-4 scrollbar-hide mb-6" ref={scrollRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {days.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        return (
          <button
            key={date.getTime()}
            onClick={() => onDateSelect(date)}
            className={`flex flex-col items-center justify-center min-w-[60px] h-[80px] rounded-full border transition-all ${
              isSelected ? 'bg-accent border-accent text-white shadow-lg shadow-accent/30 scale-110 z-10' : 'bg-card border-border text-foreground hover:bg-muted'
            }`}
          >
            <span className={`text-xs mb-1 ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
              {format(date, 'EEEEEE', { locale: ar })}
            </span>
            <span className="text-xl font-black">
              {format(date, 'd')}
            </span>
          </button>
        );
      })}
    </div>
  );
};
