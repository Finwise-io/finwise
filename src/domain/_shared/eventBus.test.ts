import { on, emit } from './eventBus';

describe('eventBus', () => {
  test('delivers the payload to a subscribed handler', () => {
    const seen: any[] = [];
    const off = on('TestEvent', (p) => seen.push(p));
    emit('TestEvent', { value: 42 });
    expect(seen).toEqual([{ value: 42 }]);
    off();
  });

  test('unsubscribe stops delivery', () => {
    const seen: any[] = [];
    const off = on('TestEvent2', (p) => seen.push(p));
    off();
    emit('TestEvent2', 'late');
    expect(seen).toHaveLength(0);
  });

  test('multiple handlers each receive the event', () => {
    const a: any[] = [], b: any[] = [];
    const offA = on('Multi', (p) => a.push(p));
    const offB = on('Multi', (p) => b.push(p));
    emit('Multi', 1);
    expect(a).toEqual([1]);
    expect(b).toEqual([1]);
    offA(); offB();
  });

  test('a throwing handler never breaks the others (handler isolation)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const seen: any[] = [];
    const offBad = on('Isolated', () => { throw new Error('boom'); });
    const offGood = on('Isolated', (p) => seen.push(p));
    expect(() => emit('Isolated', 'ok')).not.toThrow();
    expect(seen).toEqual(['ok']);
    offBad(); offGood(); warn.mockRestore();
  });

  test('emitting with no subscribers is a no-op', () => {
    expect(() => emit('NobodyListens', null)).not.toThrow();
  });
});
