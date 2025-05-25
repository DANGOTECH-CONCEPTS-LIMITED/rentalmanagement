export const API_BASE = 'http://3.216.182.63:8091';

export const verifyMeter = async ({meterNumber}: {meterNumber: string}) => {
  const res = await fetch(`${API_BASE}/ValidateMeter`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({meterNumber}),
  });
  return res.json();
};

export const previewUnits = async (meter: string, amount: number) => {
  const res = await fetch(`${API_BASE}/preview`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({meterNumber: meter, amount}),
  });
  return res.json();
};

export const processPayment = async ({
  meterNumber,
  amount,
  phoneNumber,
}: {
  meterNumber: string;
  amount: number;
  phoneNumber: string;
}) => {
  const res = await fetch(`${API_BASE}/MakeUtilityPayment`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({meterNumber, amount, phoneNumber}),
  });
  return res.json();
};

export const getUtilityPayments = async (meterNumber: string) => {
  const res = await fetch(
    `${API_BASE}/GetUtilityPaymentByMeterNumber${meterNumber}`,
  );
  return res.json();
};
