import React, { useState } from 'react';

const MeterValidation = () => {
  const [meterNumber, setMeterNumber] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [error, setError] = useState('');


    const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleValidate = async (e) => {
    e.preventDefault();
    setError('');
    setCustomerInfo(null);

    if (!meterNumber) {
      setError('Please enter a meter number.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/ValidateMeter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({ meterNumber }),
      });

      const data = await response.json();

      if (data.result_code === 0 && Array.isArray(data.result) && data.result.length > 0) {
        setCustomerInfo(data.result[0]);
      } else {
        setError(data.reason || 'No customer found.');
      }
    } catch (err) {
      setError('Error validating meter number. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Validate Customer</h1>
      <form onSubmit={handleValidate}>
        <div className="mb-4">
          <label className="block mb-2 font-medium">Meter Number</label>
          <input
            type="text"
            value={meterNumber}
            onChange={(e) => setMeterNumber(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter meter number"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Validate
        </button>
      </form>

      {customerInfo && (
        <div className="mt-4 border border-green-300 p-4 rounded bg-green-50 text-green-800">
          <h2 className="font-semibold mb-2">Customer Details</h2>
          <p><strong>Name:</strong> {customerInfo.customer_name}</p>
          <p><strong>Customer Number:</strong> {customerInfo.customer_number}</p>
          <p><strong>Meter Number:</strong> {customerInfo.meter_number}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 border border-red-300 p-4 rounded bg-red-50 text-red-700">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default MeterValidation;
