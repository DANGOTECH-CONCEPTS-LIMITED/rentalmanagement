const buildDateParts = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: date.getFullYear(),
    hours: String(date.getHours()).padStart(2, "0"),
    minutes: String(date.getMinutes()).padStart(2, "0"),
    seconds: String(date.getSeconds()).padStart(2, "0"),
  };
};

export const formatDateDmy = (value?: string | null) => {
  const parts = buildDateParts(value);
  if (!parts) {
    return "-";
  }

  return `${parts.day}-${parts.month}-${parts.year}`;
};

export const formatDateTimeDmy = (value?: string | null) => {
  const parts = buildDateParts(value);
  if (!parts) {
    return "-";
  }

  return `${parts.day}-${parts.month}-${parts.year} ${parts.hours}:${parts.minutes}:${parts.seconds}`;
};