// Preemptive Fix: Avoid Floating-Point Precision issues by working with integers.
// 3 decimal precision means multiplying by 1000.
// e.g., 10.050 -> 10050

export const parseAmountToInteger = (amountStr: string): number => {
    // Regex validation to allow max 3 decimal places
    if (!/^\d+(\.\d{1,3})?$/.test(amountStr)) {
        return 0; // Or throw error, but we'll validate in UI
    }
    const floatVal = parseFloat(amountStr);
    if (isNaN(floatVal)) return 0;
    return Math.round(floatVal * 1000);
};

export const formatAmountFromInteger = (amountInt: number): string => {
    return (amountInt / 1000).toFixed(3);
};

export const formatCurrency = (amountInt: number): string => {
    let currencyCode = 'EGP';
    try {
        const saved = localStorage.getItem('wallet_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.currency) {
                currencyCode = parsed.currency;
            }
        }
    } catch(e) {}
    
    const floatAmount = amountInt / 1000;
    
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 3
    }).format(floatAmount);
};

// Date utilities
export const getStartOfDayUTC = (date: Date): number => {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};
