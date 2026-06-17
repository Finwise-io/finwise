/**
 * Firestore security-rules tests (run against the emulator, NOT part of `npm test`).
 *
 *   npm run test:rules        # firebase emulators:exec 'jest --config jest.rules.config.cjs'
 *
 * Proves the household-sharing access boundary: a user can reach their own data and a household they
 * joined WITH A VALID INVITE CODE, but cannot reach anyone else's data by self-claiming membership
 * (the pre-fix exploit) or by forging a membership doc without a real code.
 */
const fs = require('fs');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { setDoc, getDoc, doc } = require('firebase/firestore');

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'finwise-rules-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(async () => { if (env) await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const as = (uid) => env.authenticatedContext(uid).firestore();
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()));

test('owner can read & write their own user doc', async () => {
  const db = as('alice');
  await assertSucceeds(setDoc(doc(db, 'users', 'alice'), { appState: { net: 1 } }));
  await assertSucceeds(getDoc(doc(db, 'users', 'alice')));
});

test('unauthenticated access is denied', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'users', 'alice')));
});

test('THE OLD EXPLOIT: self-claiming householdId does NOT grant access to a victim', async () => {
  await seed((a) => setDoc(doc(a, 'users', 'victim'), { appState: { secret: 42 } }));
  const mallory = as('mallory');
  // Mallory may write her OWN doc (incl. a bogus householdId) ...
  await assertSucceeds(setDoc(doc(mallory, 'users', 'mallory'), { householdId: 'victim' }));
  // ... but that must NOT let her read or write the victim's doc.
  await assertFails(getDoc(doc(mallory, 'users', 'victim')));
  await assertFails(setDoc(doc(mallory, 'users', 'victim'), { appState: { secret: 0 } }));
});

test('cannot forge a membership doc without a valid invite code', async () => {
  await seed((a) => setDoc(doc(a, 'users', 'victim'), { appState: { secret: 42 } }));
  const mallory = as('mallory');
  // No invite exists for code FAKE99 -> membership create denied -> no access.
  await assertFails(setDoc(doc(mallory, 'households', 'victim', 'members', 'mallory'), { code: 'FAKE99' }));
  await assertFails(getDoc(doc(mallory, 'users', 'victim')));
});

test('cannot create a membership doc with a code whose invite points at a DIFFERENT household', async () => {
  await seed((a) => setDoc(doc(a, 'invites', 'CODEXX'), { householdId: 'someoneElse' }));
  const mallory = as('mallory');
  // code is real but points at someoneElse, not victim -> denied for victim.
  await assertFails(setDoc(doc(mallory, 'households', 'victim', 'members', 'mallory'), { code: 'CODEXX' }));
});

test('cannot create a membership doc for a DIFFERENT member (member != auth uid)', async () => {
  await seed((a) => setDoc(doc(a, 'invites', 'CODE22'), { householdId: 'owner' }));
  const mallory = as('mallory');
  await assertFails(setDoc(doc(mallory, 'households', 'owner', 'members', 'someoneElse'), { code: 'CODE22' }));
});

test('partner WITH a valid invite code joins and reads/writes the shared household doc', async () => {
  await seed(async (a) => {
    await setDoc(doc(a, 'invites', 'GOOD22'), { householdId: 'owner' });
    await setDoc(doc(a, 'users', 'owner'), { appState: { plan: 'shared' } });
  });
  const partner = as('partner');
  // Claim membership with the real code that points at `owner` ...
  await assertSucceeds(setDoc(doc(partner, 'households', 'owner', 'members', 'partner'), { code: 'GOOD22' }));
  // ... now the partner can read AND write the shared doc.
  await assertSucceeds(getDoc(doc(partner, 'users', 'owner')));
  await assertSucceeds(setDoc(doc(partner, 'users', 'owner'), { appState: { plan: 'edited' } }));
});

test('random top-level collections are denied by default', async () => {
  const db = as('alice');
  await assertFails(getDoc(doc(db, 'secrets', 'x')));
  await assertFails(setDoc(doc(db, 'secrets', 'x'), { a: 1 }));
});
