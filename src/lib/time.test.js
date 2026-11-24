import { daylight, describeDayShift, describeOffset, formatHour, formatHourRange, formatMinuteRange, isWorkingAt, listNames, minutesUntil, shortPlace, zoneName, zoneOffset } from './time';

const teammate = { workingHours: { start: '08:00', end: '22:00' } };

test('describes offsets in plain words', () => {
  expect(describeOffset(0)).toBe('same time as you');
  expect(describeOffset(60)).toBe('1 hr ahead');
  expect(describeOffset(-630)).toBe('10.5 hrs behind');
  expect(describeOffset(30)).toBe('30 min ahead');
  // Nepal is 5 hours 45 minutes ahead of UTC: no rounding to 5.8.
  expect(describeOffset(345)).toBe('5.75 hrs ahead');
});

test('names the day only when it differs', () => {
  expect(describeDayShift(0)).toBe('');
  expect(describeDayShift(1)).toBe('tomorrow');
  expect(describeDayShift(-1)).toBe('yesterday');
});

test('working hours include the start and exclude the end', () => {
  expect(isWorkingAt(teammate, 8 * 60)).toBe(true);
  expect(isWorkingAt(teammate, 22 * 60 - 1)).toBe(true);
  expect(isWorkingAt(teammate, 22 * 60)).toBe(false);
  expect(isWorkingAt(teammate, 3 * 60)).toBe(false);
});

test('counts minutes until the working day starts, wrapping past midnight', () => {
  expect(minutesUntil(teammate, 7 * 60, 'start')).toBe(60);
  expect(minutesUntil(teammate, 23 * 60, 'start')).toBe(9 * 60);
});

test('time ranges never show a date, even across or ending at midnight', () => {
  const ranges = [
    formatMinuteRange(15 * 60, 16 * 60),
    formatMinuteRange(22 * 60, 24 * 60),
    formatMinuteRange(23 * 60, 25 * 60),
    formatMinuteRange(0, 23 * 60 + 30),
    formatMinuteRange(-90, 30),
  ];
  ranges.forEach((range) => {
    expect(range).not.toMatch(/2000|\d+\/\d+\/\d+/);
    expect(range).toMatch(/\d/);
  });
});

test('a range covering the whole day reads "All day", wherever it starts', () => {
  expect(formatMinuteRange(0, 24 * 60)).toBe('All day');
  expect(formatMinuteRange(5 * 60 + 30, 29 * 60 + 30)).toBe('All day');
  expect(formatMinuteRange(0, 23 * 60 + 30)).not.toBe('All day');
});

test('hours on the hour are written without ":00", others in full', () => {
  expect(formatHour(15 * 60)).not.toMatch(/:00/);
  expect(formatHour(15 * 60)).toMatch(/3|15/);
  expect(formatHour(15 * 60 + 30)).toMatch(/30/);
  expect(formatHourRange(8 * 60, 22 * 60)).not.toMatch(/:00/);
  expect(formatHourRange(8 * 60, 22 * 60)).toMatch(/8/);
});

test('daylight steps from night through dawn to day and back', () => {
  expect(daylight(3 * 60)).toBe(0);
  expect(daylight(6 * 60)).toBe(0.22);
  expect(daylight(7 * 60 + 30)).toBe(0.8);
  expect(daylight(12 * 60)).toBe(1);
  expect(daylight(19 * 60)).toBe(0.8);
  expect(daylight(23 * 60)).toBe(0);
});

test('lists names, folding a long list into "and N others"', () => {
  expect(listNames(['Idris'])).toBe('Idris');
  expect(listNames(['Idris', 'Thabo'])).toBe('Idris and Thabo');
  expect(listNames(['Idris', 'Thabo', 'Priya'])).toBe('Idris, Thabo and Priya');
  expect(listNames(['Idris', 'Thabo', 'Priya', 'Kai', 'Zofia'])).toBe('Idris, Thabo and 3 others');
});

test('shortens a city to a few capitals', () => {
  expect(shortPlace('Berlin')).toBe('BER');
  expect(shortPlace('New York')).toBe('NY');
  expect(shortPlace('Ho Chi Minh City')).toBe('HCMC');
  expect(shortPlace('Port-au-Prince')).toBe('PAP');
  expect(shortPlace('')).toBe('');
});

test('names a time zone and its offset', () => {
  const winter = new Date('2026-11-24T12:00:00Z');
  const summer = new Date('2026-07-01T12:00:00Z');
  expect(zoneName('Europe/Paris', winter)).toBe(zoneName('Europe/Warsaw', winter));
  expect(zoneName('Europe/Paris', winter)).toBe(zoneName('Europe/Paris', summer));
  expect(zoneName('Africa/Johannesburg', winter)).not.toBe(zoneName('Europe/Sofia', winter));
  expect(zoneOffset('Europe/Paris', winter)).toBe('UTC+1');
  expect(zoneOffset('Europe/Paris', summer)).toBe('UTC+2');
  expect(zoneOffset('Pacific/Honolulu', winter)).toBe('UTC−10');
  expect(zoneOffset('Europe/London', winter)).toBe('UTC+0');
});
