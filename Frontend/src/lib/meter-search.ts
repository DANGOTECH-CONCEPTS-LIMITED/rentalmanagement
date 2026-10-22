export function paginateMeters<T>(meters: T[], requestedPage: number, pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(meters.length / pageSize));
  const page = Math.max(1, Math.min(requestedPage, totalPages));
  const offset = (page - 1) * pageSize;
  return {
    meters: meters.slice(offset, offset + pageSize),
    page,
    totalPages,
    start: meters.length ? offset + 1 : 0,
    end: Math.min(offset + pageSize, meters.length),
  };
}

interface SearchableMeter {
  id: number;
  meterNumber?: string | null;
  meterType?: string | null;
  nwscAccount?: string | null;
  locationOfNwscMeter?: string | null;
  user?: { fullName?: string | null } | null;
}

export function filterMeters<T extends SearchableMeter>(meters: T[], search: string, includeOwner = false): T[] {
  const query = search.trim().toLowerCase();
  if (!query) return meters;

  return meters.filter((meter) => [
    String(meter.id),
    meter.meterNumber,
    meter.meterType,
    meter.nwscAccount,
    meter.locationOfNwscMeter,
    includeOwner ? meter.user?.fullName : undefined,
  ].some((value) => value?.toLowerCase().includes(query)));
}
