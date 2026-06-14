import { csvEscape, toCsv } from '../csv';

describe('csv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('has,comma')).toBe('"has,comma"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(12.5)).toBe('12.5');
  });

  it('joins rows with CRLF', () => {
    expect(toCsv([['a', 'b'], [1, null]])).toBe('a,b\r\n1,\r\n');
  });
});
