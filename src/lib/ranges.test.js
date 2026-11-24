import { joinRuns, sameRange, stepRange } from './ranges';

test('runs that meet or overlap are joined into one piece', () => {
  expect(joinRuns([{ start: 19, end: 26 }, { start: 27, end: 43 }])).toEqual([{ start: 19, end: 43 }]);
  expect(joinRuns([{ start: 2, end: 4 }, { start: 6, end: 8 }])).toEqual([{ start: 2, end: 4 }, { start: 6, end: 8 }]);
  expect(joinRuns([5, 6, 7, 10].map((slot) => ({ start: slot, end: slot })))).toEqual([{ start: 5, end: 7 }, { start: 10, end: 10 }]);
});

test('a range that has not changed counts as the same, so a drag inside one slot changes nothing', () => {
  expect(sameRange({ start: 3, end: 5 }, { start: 3, end: 5 })).toBe(true);
  expect(sameRange({ start: 3, end: 5 }, { start: 3, end: 6 })).toBe(false);
  expect(sameRange(null, null)).toBe(true);
  expect(sameRange(null, { start: 1, end: 1 })).toBe(false);
});

test('arrows move the range and keep its length, within the day', () => {
  const step = (range, key) => stepRange(range, range.start, key, false, 48, 0).range;
  expect(step({ start: 10, end: 11 }, 'ArrowRight')).toEqual({ start: 11, end: 12 });
  expect(step({ start: 10, end: 11 }, 'ArrowLeft')).toEqual({ start: 9, end: 10 });
  expect(step({ start: 46, end: 47 }, 'ArrowRight')).toEqual({ start: 46, end: 47 });
  expect(step({ start: 10, end: 13 }, 'End')).toEqual({ start: 44, end: 47 });
  expect(step({ start: 10, end: 13 }, 'Home')).toEqual({ start: 0, end: 3 });
  expect(step({ start: 10, end: 11 }, 'PageUp')).toEqual({ start: 14, end: 15 });
});

test('Shift with an arrow moves the far end, past the anchor if it goes that way', () => {
  let state = { range: { start: 10, end: 10 }, anchor: 10 };
  const press = (key) => { state = stepRange(state.range, state.anchor, key, true, 48, 0); };
  press('ArrowRight'); press('ArrowRight');
  expect(state.range).toEqual({ start: 10, end: 12 });
  press('ArrowLeft'); press('ArrowLeft'); press('ArrowLeft');
  expect(state.range).toEqual({ start: 9, end: 10 });
  press('End');
  expect(state.range).toEqual({ start: 10, end: 47 });
});

test('with nothing picked, a key picks an hour from the given slot', () => {
  expect(stepRange(null, null, 'ArrowRight', false, 48, 32)).toEqual({ range: { start: 32, end: 33 }, anchor: 32 });
  expect(stepRange(null, null, 'ArrowRight', false, 48, 47).range).toEqual({ start: 47, end: 47 });
});
