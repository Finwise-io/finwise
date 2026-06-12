import { newEntityId } from './ids';

describe('newEntityId', () => {
  test('carries the entity prefix', () => {
    expect(newEntityId('ast')).toMatch(/^ast_[a-z0-9]+$/);
    expect(newEntityId('goal')).toMatch(/^goal_/);
  });

  test('no collisions across 10,000 ids', () => {
    const ids = new Set(Array.from({ length: 10000 }, () => newEntityId('x')));
    expect(ids.size).toBe(10000);
  });

  test('ids stay short enough for keys/logs', () => {
    expect(newEntityId('debt').length).toBeLessThan(24);
  });
});
