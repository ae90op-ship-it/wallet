import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';

interface AmountInputProps {
  value: string;
  onChange: (val: string) => void;
  onError: (msg: string) => void;
}

export const AmountInput: React.FC<AmountInputProps> = ({ value, onChange, onError }) => {
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    if (/[\+\-\*\/]/.test(value)) {
      setShowCalculator(true);
    } else {
      setShowCalculator(false);
    }
  }, [value]);

  const handleCalculate = () => {
    try {
      const sanitized = value.replace(/[^0-9\+\-\*\/\.]/g, '');
      if (sanitized) {
        // eslint-disable-next-line no-new-func
        const result = new Function('return ' + sanitized)();
        if (!isNaN(result) && isFinite(result)) {
          onChange(Number(result).toFixed(3).replace(/\.?0+$/, ''));
          setShowCalculator(false);
          onError('');
        } else {
          onError('عملية حسابية غير صالحة');
        }
      }
    } catch (e) {
      onError('عملية حسابية غير صالحة');
    }
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-muted-foreground mb-1 flex justify-between">
        المبلغ
        {showCalculator && (
          <button type="button" onClick={handleCalculate} className="text-accent text-xs flex items-center gap-1 hover:underline">
            <Calculator size={12} /> احسب
          </button>
        )}
      </label>
      <div className="relative">
        <input
          type="text"
          required
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
             if (showCalculator) handleCalculate();
          }}
          onKeyDown={(e) => {
             if (e.key === 'Enter' && showCalculator) {
                e.preventDefault();
                handleCalculate();
             }
          }}
          className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-xl font-bold text-foreground focus:border-accent outline-none"
          placeholder="0.00"
          dir="ltr"
        />
      </div>
    </div>
  );
};
