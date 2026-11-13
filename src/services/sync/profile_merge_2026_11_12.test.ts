/** THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12): the profile merges item by item, by time stamp (R8–R10,
 *  R17, R18, R8a). The worked numbers are the design's own. */
import {
  SYNC_FIELDS, PHONE_ONLY_FIELDS, startSync, trackChanges, mergeProfile, settleSync, appMayStillSave, splitStamps, withStamps,
} from './profileMerge';

const acc = (id: string, label: string, balance: number) => ({ asset_id: id, label, balance });
const total = (p: any) => (p.assetAccounts ?? []).reduce((s: number, a: any) => s + a.balance, 0);
const D = '2026-11-12T';

test('R8 cloud Checking $4,000 + Brokerage $30,000; A offline adds Roth IRA $8,000 at 09:00, the spouse adds HSA $3,000 at 09:30: merged $45,000', () => {
  const agreed = { assetAccounts: [acc('chk', 'Checking', 4_000), acc('brk', 'Brokerage', 30_000)] };
  // phone A: agreed with the cloud, then adds the Roth offline at 09:00
  let a = startSync('pat', agreed);
  a = trackChanges(a, { assetAccounts: [...agreed.assetAccounts, acc('roth', 'Roth IRA', 8_000)] }, D + '09:00:00Z');
  expect(Object.keys(a.pending)).toEqual(['assetAccounts#roth']);
  // the spouse's save reached the cloud first, at 09:30
  const cloud = { assetAccounts: [...agreed.assetAccounts, acc('hsa', 'HSA', 3_000)] };
  const stamps = { 'assetAccounts#hsa': D + '09:30:00Z' };
  const m = mergeProfile(cloud, stamps, a, D + '10:00:00Z');
  expect(m.profile.assetAccounts.map((x: any) => x.label)).toEqual(['Checking', 'Brokerage', 'HSA', 'Roth IRA']);
  expect(total(m.profile)).toBe(45_000);
  expect(m.stamps['assetAccounts#roth']).toBe(D + '09:00:00Z');
  expect(m.notes).toEqual([]);
  // after the save the Roth is no longer an unsaved change
  const settled = settleSync(a, m.profile, a.pending, m.notes);
  expect(settled.pending).toEqual({});
});

test('R9 budget $3,500; A sets $4,000 at 10:00 offline, B sets $3,800 at 10:20: $3,800 counts and A\'s phone notes its $4,000', () => {
  let a = startSync('pat', { monthlyBudgetTarget: 3_500 });
  a = trackChanges(a, { monthlyBudgetTarget: 4_000 }, D + '10:00:00Z');
  const m = mergeProfile({ monthlyBudgetTarget: 3_800 }, { monthlyBudgetTarget: D + '10:20:00Z' }, a, D + '10:30:00Z');
  expect(m.profile.monthlyBudgetTarget).toBe(3_800);
  expect(m.notes).toHaveLength(1);
  expect(m.notes[0]).toMatchObject({ item: 'monthlyBudgetTarget', kept: 3_800, other: 4_000 });
  // and the other way round: B (10:20) merging over A's saved 10:00 keeps its own $3,800 and notes A's $4,000
  let b = startSync('pat', { monthlyBudgetTarget: 3_500 });
  b = trackChanges(b, { monthlyBudgetTarget: 3_800 }, D + '10:20:00Z');
  const m2 = mergeProfile({ monthlyBudgetTarget: 4_000 }, { monthlyBudgetTarget: D + '10:00:00Z' }, b, D + '10:30:00Z');
  expect(m2.profile.monthlyBudgetTarget).toBe(3_800);
  expect(m2.notes[0]).toMatchObject({ kept: 3_800, other: 4_000 });
});

test('R10 A deletes "Car $15,000" at 11:00; B\'s edit at 10:40 loses (stays deleted); the deletion marker goes on day 181', () => {
  const car = acc('car', 'Car', 15_000);
  let b = startSync('pat', { assetAccounts: [car] });
  b = trackChanges(b, { assetAccounts: [{ ...car, balance: 14_000 }] }, D + '10:40:00Z');
  const cloudStamps = { deletions: { 'assetAccounts#car': D + '11:00:00Z' } };
  const m = mergeProfile({ assetAccounts: [] }, cloudStamps, b, D + '11:30:00Z');
  expect(m.profile.assetAccounts).toEqual([]);
  expect(m.stamps.deletions).toEqual({ 'assetAccounts#car': D + '11:00:00Z' });
  // day 180 kept, day 181 dropped
  const none = startSync('pat', { assetAccounts: [] });
  expect(mergeProfile({ assetAccounts: [] }, cloudStamps, none, '2027-05-11T11:00:00Z').stamps.deletions).toEqual(cloudStamps.deletions);
  expect(mergeProfile({ assetAccounts: [] }, cloudStamps, none, '2027-05-12T11:00:01Z').stamps.deletions).toEqual({});
});

test('R10 a deletion on this phone is a stamped change: A deletes Car at 11:00 and the cloud (edit at 10:40) loses it', () => {
  const car = acc('car', 'Car', 15_000);
  let a = startSync('pat', { assetAccounts: [car] });
  a = trackChanges(a, { assetAccounts: [] }, D + '11:00:00Z');
  const m = mergeProfile({ assetAccounts: [{ ...car, balance: 14_000 }] }, { 'assetAccounts#car': D + '10:40:00Z' }, a, D + '11:05:00Z');
  expect(m.profile.assetAccounts).toEqual([]);
  expect(m.stamps.deletions?.['assetAccounts#car']).toBe(D + '11:00:00Z');
});

test('R18 the cloud profile from Build 57 has no stamps: A\'s Roth $8,000 at 09:00 is stamped, so it is kept', () => {
  const agreed = { assetAccounts: [acc('chk', 'Checking', 4_000)] };
  let a = startSync('pat', agreed);
  a = trackChanges(a, { assetAccounts: [...agreed.assetAccounts, acc('roth', 'Roth IRA', 8_000)] }, D + '09:00:00Z');
  const m = mergeProfile({ assetAccounts: [acc('chk', 'Checking', 4_000)] }, null, a, D + '09:10:00Z');
  expect(total(m.profile)).toBe(12_000);
  // a phone with no list of unsaved changes starts an empty one: the cloud's copy counts for every item
  const fresh = startSync('pat', { monthlyBudgetTarget: 9_999 });
  expect(fresh.pending).toEqual({});
  expect(mergeProfile({ monthlyBudgetTarget: 3_500 }, null, fresh, D + '09:10:00Z').profile.monthlyBudgetTarget).toBe(3_500);
});

test('R8 lists of words merge as sets; planHistory by date and label', () => {
  let a = startSync('pat', { selectedGoals: ['retire'], planHistory: [{ date: '2026-11-01', label: 'Start', snapshot: {} }] });
  a = trackChanges(a, { selectedGoals: ['retire', 'house'], planHistory: [{ date: '2026-11-01', label: 'Start', snapshot: {} }, { date: '2026-11-12', label: 'Raise', snapshot: {} }] }, D + '09:00:00Z');
  const m = mergeProfile({ selectedGoals: ['retire', 'college'], planHistory: [{ date: '2026-11-01', label: 'Start', snapshot: {} }] }, { 'selectedGoals#college': D + '08:00:00Z' }, a, D + '09:30:00Z');
  expect(m.profile.selectedGoals).toEqual(['retire', 'college', 'house']);
  expect(m.profile.planHistory.map((p: any) => p.label)).toEqual(['Start', 'Raise']);
});

test('trackChanges: a change made again keeps the later time; a change undone drops out', () => {
  let a = startSync('pat', { hourlyRate: 40 });
  a = trackChanges(a, { hourlyRate: 45 }, D + '09:00:00Z');
  a = trackChanges(a, { hourlyRate: 45 }, D + '09:05:00Z');
  expect(a.pending.hourlyRate.at).toBe(D + '09:00:00Z');
  a = trackChanges(a, { hourlyRate: 50 }, D + '09:10:00Z');
  expect(a.pending.hourlyRate).toEqual({ at: D + '09:10:00Z', value: 50 });
  a = trackChanges(a, { hourlyRate: 40 }, D + '09:20:00Z');
  expect(a.pending).toEqual({});
});

test('stamps travel inside the encrypted profile and are split off on the way in', () => {
  const stored = withStamps({ monthlyBudgetTarget: 3_800 }, { monthlyBudgetTarget: D + '10:20:00Z' });
  expect(splitStamps(stored)).toEqual({ profile: { monthlyBudgetTarget: 3_800 }, stamps: { monthlyBudgetTarget: D + '10:20:00Z' } });
});

test('R17 SYNC_FIELDS contents match the design\'s table', () => {
  for (const f of ['planHistory', 'dismissedInsights', 'knownPayees', 'goalsSeeded', 'employmentStatus', 'milestoneHighSeen', 'transitionChecks', 'drawOrder', 'lensOverride']) {
    expect(SYNC_FIELDS).toContain(f);
  }
  const phoneOnly = ['transactions', 'snapshotDays', 'invDaily', 'txnFlags', 'lastRetireChance', 'snaptradeActivityCursor', 'snaptradeLastSyncAt', 'snaptradeSeenKeys',
    'rebuiltFrom', 'rebuiltAt', 'syncFailures', 'priceCache', 'pricesFetchedAt', 'assetRecordFaults', 'debts', 'onboardingDraft'];
  expect([...PHONE_ONLY_FIELDS].sort()).toEqual([...phoneOnly].sort());
  for (const f of phoneOnly) expect(SYNC_FIELDS as readonly string[]).not.toContain(f);
  expect(SYNC_FIELDS.length).toBe(55);   // 46 before + 9 added
});

test('R8a an app older than the cloud\'s minimum version stops saving', () => {
  expect(appMayStillSave('1.0.57', '1.0.58')).toBe(false);
  expect(appMayStillSave('1.0.58', '1.0.58')).toBe(true);
  expect(appMayStillSave('1.0.100', '1.0.58')).toBe(true);
  expect(appMayStillSave('1.0.57', null)).toBe(true);
});
