/** R16 (design v02 of the cloud copy of the master record, 2026-11-12): delete account runs on the server
 *  (functions/accountDelete.js). Firestore is held in memory here, with the Admin SDK calls the function uses. */
const { deleteAccountData } = require('../../functions/accountDelete');

const DEL = { __delete: true };
const FieldValue = { delete: () => DEL };
function memoryDb(seed: Record<string, any>) {
  const docs: Record<string, any> = JSON.parse(JSON.stringify(seed));
  const children = (prefix: string) => Object.keys(docs).filter((p) => p.startsWith(prefix + '/') && p.slice(prefix.length + 1).split('/').length === 1);
  const docRef = (path: string) => ({
    path,
    get: async () => ({ exists: path in docs, data: () => docs[path] }),
    set: async (data: any, o?: any) => {
      const out = o?.merge ? { ...(docs[path] ?? {}) } : {};
      for (const [k, v] of Object.entries(data)) { if (v === DEL) delete out[k]; else out[k] = v; }
      docs[path] = out;
    },
    delete: async () => { delete docs[path]; },
  });
  const query = (paths: string[]) => ({ get: async () => ({ empty: !paths.length, docs: paths.map((p) => ({ id: p.split('/').pop(), data: () => docs[p] })) }) });
  return {
    docs,
    doc: docRef,
    collection: (path: string) => ({
      path,
      ...query(children(path)),
      where: (f: string, _op: string, v: any) => query(children(path).filter((p) => docs[p]?.[f] === v)),
    }),
    recursiveDelete: async (ref: { path: string }) => { for (const p of Object.keys(docs)) if (p === ref.path || p.startsWith(ref.path + '/')) delete docs[p]; },
  };
}
/** Pat's household with 815 rows: 3 parts (400 + 400 + 15), the marker, the questions and the profile; Sam is the member. */
function patsHousehold() {
  return memoryDb({
    'users/pat': { email: 'p@p.com', keyEnvelope: { p: 'PAT-P', r: 'PAT-R' }, appStateEnc: 'enc:pat-profile (Brokerage $30,000)', keyId: '9c41e0aa51d7', profileRev: 7 },
    'users/pat/assetRecord/0': { enc: 'enc:rows 1-400', keyId: '9c41e0aa51d7' },
    'users/pat/assetRecord/1': { enc: 'enc:rows 401-800', keyId: '9c41e0aa51d7' },
    'users/pat/assetRecord/2': { enc: 'enc:rows 801-815', keyId: '9c41e0aa51d7' },
    'users/pat/assetRecord/marker': { writer: 'phone-p', rows: 815, lastRowId: '815' },
    'users/pat/assetRecord/questions': { enc: 'enc:questions', keyId: '9c41e0aa51d7' },
    'households/pat/members/sam': { code: 'K7MQ2D', keyCodeProof: 'proof' },
    'households/pat/keyReturn/current': { enc: 'enc:k' },
    'invites/ZZZZZZ': { householdId: 'pat' },
    'invites/OTHER1': { householdId: 'someoneElse' },
    'users/sam': { email: 's@s.com', keyEnvelope: { p: 'SAM-P', r: 'SAM-R' }, householdKeyEnvelope: { p: 'HH-P', r: 'HH-R' }, householdId: 'pat', appStateEnc: 'enc:sam-own' },
    'users/sam/assetRecord/0': { enc: 'enc:sam pre-joining rows' },
  });
}

test('R16 owner with a member deletes, 815 rows: Sam holds the 3 parts, the marker and the profile (Brokerage $30,000), the household key is his own, and nothing is left under users/pat', async () => {
  const db = patsHousehold();
  const out = await deleteAccountData(db, 'pat', FieldValue);
  expect(out).toEqual({ kind: 'owner-moved', member: 'sam', parts: 5 });
  expect(db.docs['users/sam']).toMatchObject({ appStateEnc: 'enc:pat-profile (Brokerage $30,000)', keyId: '9c41e0aa51d7', keyEnvelope: { p: 'HH-P', r: 'HH-R' }, movedFrom: 'pat', profileRev: 8 });
  expect(db.docs['users/sam'].householdId).toBeUndefined();
  expect(db.docs['users/sam'].householdKeyEnvelope).toBeUndefined();
  expect(db.docs['users/sam/assetRecord/marker'].rows).toBe(815);
  expect(['0', '1', '2'].map((p) => db.docs[`users/sam/assetRecord/${p}`].enc)).toEqual(['enc:rows 1-400', 'enc:rows 401-800', 'enc:rows 801-815']);
  expect(db.docs['users/sam/assetRecord/questions'].enc).toBe('enc:questions');
  expect(Object.keys(db.docs).filter((p) => p === 'users/pat' || p.startsWith('users/pat/'))).toEqual([]);
  expect(Object.keys(db.docs).filter((p) => p.startsWith('households/pat/'))).toEqual([]);
  expect(db.docs['invites/ZZZZZZ']).toBeUndefined();
  expect(db.docs['invites/OTHER1']).toBeDefined();
});

test('R16 a member deletes: only users/sam and the member document go — Pat\'s 3 parts are untouched', async () => {
  const db = patsHousehold();
  expect(await deleteAccountData(db, 'sam', FieldValue)).toEqual({ kind: 'member', household: 'pat' });
  expect(Object.keys(db.docs).filter((p) => p.startsWith('users/sam'))).toEqual([]);
  expect(db.docs['households/pat/members/sam']).toBeUndefined();
  expect(['0', '1', '2'].map((p) => db.docs[`users/pat/assetRecord/${p}`].enc)).toEqual(['enc:rows 1-400', 'enc:rows 401-800', 'enc:rows 801-815']);
  expect(db.docs['users/pat'].appStateEnc).toBe('enc:pat-profile (Brokerage $30,000)');
});

test('R16 solo: everything under users/{self} goes, the parts and marker with it (Build 57 left them all)', async () => {
  const db = memoryDb({ 'users/al': { appStateEnc: 'enc:a' }, 'users/al/assetRecord/0': { enc: 'x' }, 'users/al/assetRecord/marker': { rows: 1 }, 'users/bo': { appStateEnc: 'enc:b' } });
  expect(await deleteAccountData(db, 'al', FieldValue)).toEqual({ kind: 'solo' });
  expect(Object.keys(db.docs)).toEqual(['users/bo']);
});

test('R16 + R11 (DEC-10813): Sam\'s own pre-joining data is set aside under users/sam/setAside/own — his profile, his own key envelope and his rows — never overwritten or deleted', async () => {
  const db = patsHousehold();
  await deleteAccountData(db, 'pat', FieldValue);
  expect(db.docs['users/sam/setAside/own']).toMatchObject({ owner: 'sam', appStateEnc: 'enc:sam-own', keyEnvelope: { p: 'SAM-P', r: 'SAM-R' } });
  expect(db.docs['users/sam/setAside/own/assetRecord/0'].enc).toBe('enc:sam pre-joining rows');
  // the household's copy is what users/sam now holds
  expect(db.docs['users/sam'].appStateEnc).toBe('enc:pat-profile (Brokerage $30,000)');
  expect(db.docs['users/sam/assetRecord/0'].enc).toBe('enc:rows 1-400');
  // a second run (a retry after a failure part-way) never sets the household's copy aside over Sam's own
  db.docs['users/pat'] = { appStateEnc: 'enc:pat again' };
  db.docs['households/pat/members/sam'] = { code: 'K7MQ2D' };
  await deleteAccountData(db, 'pat', FieldValue);
  expect(db.docs['users/sam/setAside/own'].appStateEnc).toBe('enc:sam-own');
});
