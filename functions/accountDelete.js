// R16 — DELETE ACCOUNT RUNS ON THE SERVER (design v02 of the cloud copy of the master record, 2026-11-12; lead's decision,
// reversible). The phone re-signs in, then calls this with its sign-in token; the Admin SDK does what the access rules will
// not let a phone do.
//   · Solo: everything under users/{self} goes (the profile, the record's parts, its marker and questions), and any invite.
//   · A member: only users/{self} (with everything under it) and their member document; the household is untouched.
//   · An owner with a member: the household's profile, parts, marker and questions are copied to users/{member}, the
//     household key becomes the member's own, the member is re-pointed (movedFrom names the owner, so the member's phone
//     treats it as the same data, R11), then users/{owner} with everything under it, households/{owner}/members/*, the
//     return-code document and pending invites are deleted. Copy first, delete last: a failure part-way loses nothing.
//   The member's own pre-joining cloud data (profile, own key envelope, record parts) is first SET ASIDE under
//   users/{member}/setAside/own (R11, DEC-10813) — never replaced — so the household's parts never mix with it.

/** `db` is an Admin Firestore (or a test's stand-in); `FieldValue` is admin.firestore.FieldValue. Returns what was done. */
async function deleteAccountData(db, uid, FieldValue) {
  const meRef = db.doc(`users/${uid}`);
  const meSnap = await meRef.get();
  const me = meSnap.exists ? meSnap.data() : {};
  const household = me.householdId && me.householdId !== uid ? me.householdId : null;

  if (household) {
    await db.doc(`households/${household}/members/${uid}`).delete();
    await db.recursiveDelete(meRef);
    return { kind: 'member', household };
  }

  const members = await db.collection(`households/${uid}/members`).get();
  if (!members.empty) {
    const member = members.docs[0].id;   // households of over one member are out of scope (design §7)
    const targetRef = db.doc(`users/${member}`);
    const tSnap = await targetRef.get();
    const t = tSnap.exists ? tSnap.data() : {};
    // R11 + DEC-10813: the member's own pre-joining data — profile, own key envelope and record — is SET ASIDE under
    // users/{member}/setAside/own, never overwritten or deleted (outside check, 2026-11-12: R16 replaced Sam's own profile).
    // Only once: a retry after a failure part-way never sets the household's copy aside over the member's own.
    const asideRef = db.doc(`users/${member}/setAside/own`);
    const asideSnap = await asideRef.get();
    const ownParts = await db.collection(`users/${member}/assetRecord`).get();
    if (!asideSnap.exists && !t.movedFrom) {
      for (const d of ownParts.docs) await db.doc(`users/${member}/setAside/own/assetRecord/${d.id}`).set(d.data());
      const own = { owner: member, at: new Date().toISOString() };
      for (const k of ['appStateEnc', 'keyEnvelope', 'keyId', 'profileRev']) if (t[k] != null) own[k] = t[k];
      await asideRef.set(own);
    }
    // then the member's own parts leave users/{member}/assetRecord, so the household's never mix with them
    await db.recursiveDelete(db.collection(`users/${member}/assetRecord`));
    const parts = await db.collection(`users/${uid}/assetRecord`).get();
    for (const d of parts.docs) await db.doc(`users/${member}/assetRecord/${d.id}`).set(d.data());
    await targetRef.set({
      appStateEnc: me.appStateEnc != null ? me.appStateEnc : FieldValue.delete(),
      keyId: me.keyId != null ? me.keyId : FieldValue.delete(),
      profileRev: typeof me.profileRev === 'number' ? me.profileRev + 1 : 1,
      // the household key, locked under the member's own password and recovery code, becomes the member's own
      ...(t.householdKeyEnvelope ? { keyEnvelope: t.householdKeyEnvelope } : {}),
      householdKeyEnvelope: FieldValue.delete(),
      householdId: FieldValue.delete(),
      movedFrom: uid,
    }, { merge: true });
    await deleteOwnerSide(db, uid);
    await db.recursiveDelete(meRef);
    return { kind: 'owner-moved', member, parts: parts.docs.length };
  }

  await deleteOwnerSide(db, uid);
  await db.recursiveDelete(meRef);
  return { kind: 'solo' };
}

async function deleteOwnerSide(db, uid) {
  const members = await db.collection(`households/${uid}/members`).get();
  for (const d of members.docs) await db.doc(`households/${uid}/members/${d.id}`).delete();
  await db.recursiveDelete(db.collection(`households/${uid}/keyReturn`));
  const invites = await db.collection('invites').where('householdId', '==', uid).get();
  for (const d of invites.docs) await db.doc(`invites/${d.id}`).delete();
}

module.exports = { deleteAccountData };
