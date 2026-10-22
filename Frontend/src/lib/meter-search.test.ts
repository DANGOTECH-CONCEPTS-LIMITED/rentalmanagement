import { filterMeters, paginateMeters } from './meter-search';

const manyMeters = Array.from({ length: 26 }, (_, index) => ({ id: index + 1 }));

test('paginates ten meters at a time by default', () => {
  expect(paginateMeters(manyMeters, 1)).toEqual({ meters: manyMeters.slice(0, 10), page: 1, totalPages: 3, start: 1, end: 10 });
  expect(paginateMeters(manyMeters, 2)).toEqual({ meters: manyMeters.slice(10, 20), page: 2, totalPages: 3, start: 11, end: 20 });
  expect(paginateMeters(manyMeters, 3)).toEqual({ meters: manyMeters.slice(20), page: 3, totalPages: 3, start: 21, end: 26 });
});

test('supports changing the page size', () => {
  expect(paginateMeters(manyMeters, 2, 25)).toEqual({ meters: manyMeters.slice(25), page: 2, totalPages: 2, start: 26, end: 26 });
  expect(paginateMeters(manyMeters, 1, 50).meters).toEqual(manyMeters);
});

test('keeps page and range valid after filtering or removing meters', () => {
  const filtered = filterMeters(manyMeters, '26');
  expect(paginateMeters(filtered, 3)).toEqual({ meters: [{ id: 26 }], page: 1, totalPages: 1, start: 1, end: 1 });
  expect(paginateMeters(manyMeters, 0).page).toBe(1);
});

test('handles an empty search result without invalid page counts', () => {
  expect(paginateMeters([], 5)).toEqual({ meters: [], page: 1, totalPages: 1, start: 0, end: 0 });
});

const meters = [
  { id: 9, meterNumber: '0292000011000', meterType: 'Water', nwscAccount: '511004638', locationOfNwscMeter: 'Kawuuku', user: { fullName: 'Jane Owner' } },
  { id: 10, meterNumber: '0292000010994', meterType: 'Electricity', nwscAccount: '21484548', locationOfNwscMeter: 'Butto', user: { fullName: 'John Owner' } },
];

test.each(['', '   '])('empty search returns all meters without changing the list', (query) => {
  expect(filterMeters(meters, query)).toBe(meters);
});

test.each(['11000', '  wAtEr  ', '511004', 'KAWUUKU'])('searches visible meter fields: %s', (query) => {
  expect(filterMeters(meters, query)).toEqual([meters[0]]);
});

test('searches meter IDs', () => {
  expect(filterMeters([{ id: 42, meterNumber: 'ABC' }], '42')).toEqual([{ id: 42, meterNumber: 'ABC' }]);
});

test('searches owner names only when the owner column is visible', () => {
  expect(filterMeters(meters, 'Jane', true)).toEqual([meters[0]]);
  expect(filterMeters(meters, 'Jane')).toEqual([]);
});

test('handles optional fields and unmatched searches', () => {
  expect(filterMeters([{ id: 1, meterNumber: null, user: null }], 'unknown')).toEqual([]);
  expect(filterMeters(meters, 'missing')).toEqual([]);
});

test('clearing a filter restores all meters', () => {
  expect(filterMeters(meters, 'Butto')).toEqual([meters[1]]);
  expect(filterMeters(meters, '')).toEqual(meters);
});
