import React, { useMemo } from 'react';
import { getDaysInMonth, startOfMonth, format, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';

interface CircularCalendarProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  // Map of day (1-31) to boolean or objects denoting income/expense exist
  dayMarkers: Record<number, { hasIncome: boolean; hasExpense: boolean }>;
}

export const CircularCalendar: React.FC<CircularCalendarProps> = ({
  currentDate,
  selectedDate,
  onDateSelect,
  dayMarkers,
}) => {
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = startOfMonth(currentDate);

  const radius = 120;
  const center = 144;
  
  // Calculate positions for each day
  const days = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= daysInMonth; i++) {
      // Start from top (-90 degrees)
      const angle = (i / daysInMonth) * 2 * Math.PI - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      arr.push({ day: i, x, y, date, angle });
    }
    return arr;
  }, [daysInMonth, currentDate]);

  return (
    <div className="relative w-[288px] h-[288px] mx-auto select-none my-4">
      <svg width="288" height="288" className="drop-shadow-lg">
        {/* Inner track */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#1e2229" strokeWidth="8" />
        
        {/* Days */}
        {days.map(({ day, x, y, date, angle }) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const markers = dayMarkers[day] || { hasIncome: false, hasExpense: false };
          
          return (
            <g 
              key={day} 
              transform={`translate(${x}, ${y})`} 
              onClick={() => onDateSelect(date)}
              className="cursor-pointer transition-transform hover:scale-110"
            >
              <circle
                cx="0"
                cy="0"
                r={isSelected ? "18" : "14"}
                fill={isSelected ? "#f59e0b" : (isToday ? "#2a2f3a" : "transparent")}
                stroke={isSelected ? "#f59e0b" : "transparent"}
                strokeWidth={isSelected ? "2" : "0"}
                className="transition-all duration-300"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={isSelected ? "14" : "12"}
                fontWeight={isSelected ? "bold" : "normal"}
                fill={isSelected ? "#ffffff" : "#6b7280"}
                className="pointer-events-none"
              >
                {day}
              </text>
              
              {/* Markers for income/expense around the day circle */}
              {markers.hasIncome && (
                <circle cx="-10" cy="-10" r="4" fill="#10b981" stroke="#14161a" strokeWidth="2" />
              )}
              {markers.hasExpense && (
                <circle cx="10" cy="-10" r="4" fill="#ef4444" stroke="#14161a" strokeWidth="2" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-100 z-10">
        <span className="text-gray-400 text-sm">اليوم</span>
        <span className="text-5xl font-black">{format(selectedDate, 'dd', { locale: ar })}</span>
        <span className="text-gray-500 text-xs mt-1">{format(selectedDate, 'MMMM yyyy', { locale: ar })}</span>
      </div>
    </div>
  );
};
