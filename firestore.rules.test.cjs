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
  await assertSucceeds(setDoc(doc(db, 'users', 'alice'), { appState: { net: 1 }, profileRev: 1 }));
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

test('R13 (design v02, 2026-11-12): a valid invite code WITHOUT the proof of the key code no longer joins the household', async () => {
  await seed(async (a) => {
    await setDoc(doc(a, 'invites', 'GOOD22'), { householdId: 'owner' });
    await setDoc(doc(a, 'users', 'owner'), { appState: { plan: 'shared' } });
  });
  const partner = as('partner');
  // before this design, the code alone made a member who could read AND write the shared doc
  await assertFails(setDoc(doc(partner, 'households', 'owner', 'members', 'partner'), { code: 'GOOD22' }));
  await assertFails(getDoc(doc(partner, 'users', 'owner')));
});

test('random top-level collections are denied by default', async () => {
  const db = as('alice');
  await assertFails(getDoc(doc(db, 'secrets', 'x')));
  await assertFails(setDoc(doc(db, 'secrets', 'x'), { a: 1 }));
});

test('snaptrade_users is server-only: a user cannot read even THEIR OWN secret record', async () => {
  await seed((a) => setDoc(doc(a, 'snaptrade_users', 'alice'), { userId: 'mk-alice', userSecret: 'S' }));
  const alice = as('alice');
  await assertFails(getDoc(doc(alice, 'snaptrade_users', 'alice')));
  await assertFails(setDoc(doc(alice, 'snaptrade_users', 'alice'), { userSecret: 'forged' }));
  await assertFails(getDoc(doc(as('mallory'), 'snaptrade_users', 'alice')));
});

// ── THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12) ──────────────────────────────────────────────────────
const crypto = require('crypto');
const { deleteDoc, updateDoc, serverTimestamp, Timestamp } = require('firebase/firestore');
const sha256hex = (s) => crypto.createHash('sha256').update(s).digest('hex');
const PROOF = 'proof-of-key-code-for-K7MQ2D';
const CHECK = sha256hex(PROOF);
async function household() {
  await seed(async (a) => {
    await setDoc(doc(a, 'users', 'pat'), { keyEnvelope: { p: 'P', r: 'R' }, appStateEnc: 'enc:old', profileRev: 7 });
    await setDoc(doc(a, 'households', 'pat', 'members', 'sam'), { code: 'K7MQ2D', keyCodeProof: PROOF });
    await setDoc(doc(a, 'users', 'pat', 'assetRecord', '0'), { enc: 'enc:part0', keyId: '9c41e0aa51d7' });
  });
}

test('R8a profileRev is 7: a Build 57 save without profileRev is refused, the merged profile at 7 stays', async () => {
  await seed((a) => setDoc(doc(a, 'users', 'pat'), { appStateEnc: 'enc:merged', profileRev: 7 }));
  const pat = as('pat');
  await assertFails(setDoc(doc(pat, 'users', 'pat'), { appStateEnc: 'enc:build57' }, { merge: true }));
  await assertFails(setDoc(doc(pat, 'users', 'pat'), { appStateEnc: 'enc:skip', profileRev: 9 }, { merge: true }));
  await assertFails(setDoc(doc(pat, 'users', 'pat'), { appStateEnc: 'enc:same', profileRev: 7 }, { merge: true }));
  await assertSucceeds(setDoc(doc(pat, 'users', 'pat'), { appStateEnc: 'enc:next', profileRev: 8 }, { merge: true }));
});

test('R18 a Build 57 profile has no profileRev: it counts as 0, so the next save carries 1', async () => {
  await seed((a) => setDoc(doc(a, 'users', 'pat'), { appStateEnc: 'enc:build57' }));
  const pat = as('pat');
  await assertFails(setDoc(doc(pat, 'users', 'pat'), { appStateEnc: 'enc:again' }, { merge: true }));
  await assertSucceeds(setDoc(doc(pat, 'users', 'pat'), { appStateEnc: 'enc:first', profileRev: 1 }, { merge: true }));
  // fields that are not the profile (the key envelope, the household) save without profileRev
  await assertSucceeds(setDoc(doc(pat, 'users', 'pat'), { keyEnvelope: { p: 'P2', r: 'R2' } }, { merge: true }));
});

test('R13 a member saves the profile, the parts, the marker and the questions of the household', async () => {
  await household();
  const sam = as('sam');
  await assertSucceeds(setDoc(doc(sam, 'users', 'pat'), { appStateEnc: 'enc:sam', profileRev: 8, keyId: '9c41e0aa51d7' }, { merge: true }));
  await assertSucceeds(setDoc(doc(sam, 'users', 'pat', 'assetRecord', '1'), { enc: 'enc:p1', keyId: '9c41e0aa51d7' }));
  await assertSucceeds(setDoc(doc(sam, 'users', 'pat', 'assetRecord', 'marker'), { writer: 'phone-s', rows: 415 }));
  await assertSucceeds(setDoc(doc(sam, 'users', 'pat', 'assetRecord', 'questions'), { enc: 'enc:q', keyId: '9c41e0aa51d7' }));
  await assertSucceeds(getDoc(doc(sam, 'users', 'pat', 'assetRecord', '0')));
});

test('R13 a member never writes the owner\'s key envelope, the household or a move, and never deletes', async () => {
  await household();
  const sam = as('sam');
  await assertFails(setDoc(doc(sam, 'users', 'pat'), { keyEnvelope: { p: 'X', r: 'Y' } }, { merge: true }));
  await assertFails(setDoc(doc(sam, 'users', 'pat'), { householdKeyEnvelope: { p: 'X', r: 'Y' } }, { merge: true }));
  await assertFails(setDoc(doc(sam, 'users', 'pat'), { householdId: 'sam' }, { merge: true }));
  await assertFails(deleteDoc(doc(sam, 'users', 'pat')));
  await assertFails(deleteDoc(doc(sam, 'users', 'pat', 'assetRecord', '0')));
  // a whole-document write from a member that drops the envelope is refused too
  await assertFails(setDoc(doc(sam, 'users', 'pat'), { appStateEnc: 'enc:sam', profileRev: 8 }));
});

test('R13 join with the invite code K7MQ2D only: refused', async () => {
  await seed((a) => setDoc(doc(a, 'invites', 'K7MQ2D'), { householdId: 'pat', createdAt: Timestamp.now(), wrappedKey: 'enc:wrapped', keyCodeCheck: CHECK }));
  const mallory = as('mallory');
  await assertFails(setDoc(doc(mallory, 'households', 'pat', 'members', 'mallory'), { code: 'K7MQ2D' }));
  await assertFails(setDoc(doc(mallory, 'households', 'pat', 'members', 'mallory'), { code: 'K7MQ2D', keyCodeProof: 'a guess' }));
  await assertFails(getDoc(doc(mallory, 'users', 'pat')));
});

test('R13 join with the invite code and the proof of the key code: Sam joins and reads Pat\'s profile', async () => {
  await seed(async (a) => {
    await setDoc(doc(a, 'invites', 'K7MQ2D'), { householdId: 'pat', createdAt: Timestamp.now(), wrappedKey: 'enc:wrapped', keyCodeCheck: CHECK });
    await setDoc(doc(a, 'users', 'pat'), { appStateEnc: 'enc:pat', profileRev: 3 });
  });
  const sam = as('sam');
  await assertSucceeds(setDoc(doc(sam, 'households', 'pat', 'members', 'sam'), { code: 'K7MQ2D', keyCodeProof: PROOF, joinedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(doc(sam, 'users', 'pat')));
  // the member deletes the invite once the key is re-locked under Sam's own password
  await assertSucceeds(deleteDoc(doc(sam, 'invites', 'K7MQ2D')));
});

test('R13 an invite created 8 days ago is expired: the right proof is refused', async () => {
  const eightDaysAgo = Timestamp.fromMillis(Date.now() - 8 * 86400000);
  await seed((a) => setDoc(doc(a, 'invites', 'K7MQ2D'), { householdId: 'pat', createdAt: eightDaysAgo, wrappedKey: 'enc:wrapped', keyCodeCheck: CHECK }));
  await assertFails(setDoc(doc(as('sam'), 'households', 'pat', 'members', 'sam'), { code: 'K7MQ2D', keyCodeProof: PROOF }));
});

test('R13 an invite must carry the locked key, the check value and the server\'s creation time (the 7 days count from it)', async () => {
  const pat = as('pat');
  await assertFails(setDoc(doc(pat, 'invites', 'AAAAAA'), { householdId: 'pat', createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(pat, 'invites', 'BBBBBB'), { householdId: 'pat', createdAt: Timestamp.fromMillis(Date.now() + 30 * 86400000), wrappedKey: 'enc:w', keyCodeCheck: CHECK }));
  await assertSucceeds(setDoc(doc(pat, 'invites', 'CCCCCC'), { householdId: 'pat', inviterName: 'Pat', createdAt: serverTimestamp(), wrappedKey: 'enc:w', keyCodeCheck: CHECK }));
  await assertFails(deleteDoc(doc(as('mallory'), 'invites', 'CCCCCC')));
  await assertSucceeds(deleteDoc(doc(pat, 'invites', 'CCCCCC')));
});

test('R14 a member leaves a return code\'s locked key for the owner; a stranger can neither write nor read it', async () => {
  await household();
  await assertSucceeds(setDoc(doc(as('sam'), 'households', 'pat', 'keyReturn', 'current'), { enc: 'enc:k', expiresAt: Timestamp.fromMillis(Date.now() + 86400000) }));
  await assertSucceeds(getDoc(doc(as('pat'), 'households', 'pat', 'keyReturn', 'current')));
  await assertFails(getDoc(doc(as('mallory'), 'households', 'pat', 'keyReturn', 'current')));
  await assertFails(setDoc(doc(as('mallory'), 'households', 'pat', 'keyReturn', 'current'), { enc: 'enc:evil' }));
  await assertSucceeds(deleteDoc(doc(as('pat'), 'households', 'pat', 'keyReturn', 'current')));
});

test('R8a config/app (the minimum app version) is read by anyone signed in, written by nobody', async () => {
  await seed((a) => setDoc(doc(a, 'config', 'app'), { minVersion: '1.0.58' }));
  await assertSucceeds(getDoc(doc(as('pat'), 'config', 'app')));
  await assertFails(setDoc(doc(as('pat'), 'config', 'app'), { minVersion: '0' }));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'config', 'app')));
});
