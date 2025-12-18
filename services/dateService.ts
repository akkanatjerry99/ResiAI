// services/dateService.ts

/**
 * Converts a Gregorian date to the Buddhist Era (BE) format.
 * It adds 543 to the year and formats the date string.
 * @param date - The date to convert (Date object or string).
 * @param options - Intl.DateTimeFormatOptions to customize the output.
 * @returns A formatted date string in BE.
 */
export const formatToBuddhistEra = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
        return '';
    }

    const year = d.getFullYear() + 543;

    // We can't just setFullYear on the original date as it might be used elsewhere.
    // Instead, we format parts of the date and combine them.
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');

    if (options?.weekday === 'narrow') {
        return d.toLocaleDateString('en-US', { weekday: 'narrow' });
    }
    
    if (options?.timeStyle) {
        return `${day}/${month}/${year} ${d.toLocaleTimeString('en-GB', { timeStyle: options.timeStyle })}`;
    }
    
    if (options?.hour) {
         return `${day}/${month}/${year} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    }

    return `${day}/${month}/${year}`;
};
