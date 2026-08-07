import React, { useMemo } from 'react';
import { Transaction } from '../db/db';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface RadialClockProps {
  selectedDate: Date;
  transactions: Transaction[];
  totalWealth: number;
}

export const RadialClock: React.FC<RadialClockProps> = ({ selectedDate, transactions, totalWealth }) => {
  const radius = 120;
  const center = 160;

  // Compute angles for transactions (24 hour clock)
  const txNodes = useMemo(() => {
    const nodes: any[] = [];
    
    // Group transactions by hour to handle offset
    const hourlyCounts: Record<number, number> = {};

    transactions.forEach(tx => {
      const date = new Date(tx.dateTime);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      const hourKey = hours;
      hourlyCounts[hourKey] = (hourlyCounts[hourKey] || 0) + 1;
      
      // Calculate offset based on number of tx in this hour
      const offsetIndex = hourlyCounts[hourKey] - 1;
      const angleOffset = offsetIndex * (Math.PI / 12); // Spread them out slightly
      
      // 24 hours = 2 * PI. Top is 0 hours. (- PI / 2 to start at top)
      const decimalHours = hours + (minutes / 60);
      const baseAngle = (decimalHours / 24) * 2 * Math.PI - Math.PI / 2;
      
      const angle = baseAngle + angleOffset;
      
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      
      nodes.push({ tx, x, y, angle });
    });
    
    return nodes;
  }, [transactions]);

  // Generate 24-hour tick marks
  const ticks = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i / 24) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % 6 === 0;
    const tickRadius = isMajor ? radius - 10 : radius - 5;
    return {
      x1: center + radius * Math.cos(angle),
      y1: center + radius * Math.sin(angle),
      x2: center + tickRadius * Math.cos(angle),
      y2: center + tickRadius * Math.sin(angle),
      hour: i
    };
  });

  return (
    <div className="relative w-[320px] h-[320px] mx-auto select-none my-6">
      <svg width="320" height="320" className="drop-shadow-lg">
        {/* Clock Background */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth="12" />
        
        {/* Ticks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={i % 6 === 0 ? "var(--muted-foreground)" : "var(--border)"}
            strokeWidth={i % 6 === 0 ? "2" : "1"}
          />
        ))}

        {/* Transactions Arcs/Points */}
        {txNodes.map((node, i) => {
          const color = node.tx.type === 'income' ? '#10b981' : node.tx.type === 'expense' ? '#ef4444' : '#3b82f6';
          return (
            <g key={i}>
              <circle
                cx={node.x}
                cy={node.y}
                r="6"
                fill={color}
                stroke="var(--card)"
                strokeWidth="2"
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                className="transition-all duration-300 hover:r-8 hover:cursor-pointer"
              />
            </g>
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-foreground z-10">
        <span className="text-muted-foreground text-sm uppercase tracking-widest font-semibold mb-1">
          {format(selectedDate, 'EEEE', { locale: ar })}
        </span>
        <span className="text-4xl font-black mb-1">
          {format(selectedDate, 'dd', { locale: ar })}
        </span>
        <span className="text-accent text-lg font-bold">
          {formatCurrency(totalWealth)}
        </span>
      </div>
    </div>
  );
};
