// The platform enforces a single currency. Change this one constant (and the
// corresponding backend data) to adopt a different default rather than mixing
// currencies per record.
export const DEFAULT_CURRENCY = 'UGX';

export const useCurrencyFormatter = (currency = DEFAULT_CURRENCY) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  return formatCurrency;
};
