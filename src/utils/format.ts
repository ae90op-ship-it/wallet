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
    const amountStr = (Math.abs(amountInt) / 1000).toFixed(3);
    const parts = amountStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${amountInt < 0 ? '-' : ''}${parts.join('.')} د.ك`; // Using Kuwaiti Dinar as example or generic currency
};

// Date utilities
export const getStartOfDayUTC = (date: Date): number => {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};
