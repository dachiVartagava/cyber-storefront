import i18n from '../i18n';

/**
 * Formats currency amounts according to active language using browser Intl API (FE-008):
 * Georgian (ka): 1 234,56 ₾ (or integer if no decimals)
 * English (en): ₾1,234.56
 */
export function formatPrice(amount: number, currency = 'GEL'): string {
  const lang = i18n.language || 'ka';
  const hasDecimals = amount % 1 !== 0;

  if (lang.startsWith('en')) {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
    const symbol = currency === 'GEL' ? '₾' : currency;
    return `${symbol}${formatted}`;
  }

  // Georgian formatting: space separator, comma decimal, ₾ at the end
  const formatted = new Intl.NumberFormat('ka-GE', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
  const symbol = currency === 'GEL' ? '₾' : currency;
  return `${formatted} ${symbol}`;
}

/**
 * Formats ISO date strings according to active language using browser Intl API (FE-008)
 */
export function formatDate(dateString: string): string {
  const lang = i18n.language || 'ka';
  const locale = lang.startsWith('en') ? 'en-US' : 'ka-GE';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}
