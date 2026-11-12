// Net worth and Performance · WHAT A PHONE ALREADY HOLDS, MOVED ONTO THE ONE MASTER RECORD ONCE (asset-record.ts).
//
// WHAT IT DOES (phase 2 of the approved plan, 2026-11-11, step 6: "What a phone already holds is moved onto the list
// once, on opening. Dates nobody gave stay blank, never the phone's date"). For each account the record holds nothing for:
//   · AN ACCOUNT TYPED BY HAND — its value on its "Value as of" date (blank where none), a bond's or CD's facts, and
//     every transaction the account holder recorded, each on its own date, saved as typed exactly as
//     asset-record-from-typed.ts saves a new entry. A holding's tax lots on the phone are what its first entry (an
//     opening record), its purchases and its sales LEFT, so lots and activity are never both saved for one holding:
//       – where the activity adds up to the shares the holding shows, the activity is saved (each purchase and sale on
//         its own date, so a sale keeps what it made);
//       – where it does not (lots entered before opening records were kept, 2026-10-23), the tax lots as they stand are
//         saved instead, and that holding's purchases and sales are not, with a sentence saying so.
//   · AN ACCOUNT MADE FROM AN IMPORTED FILE — the file is gone, so the account as it was saved stands for it: its tax
//     lots as the file's list (purchasesFromList, the day of the list being the account's "Value as of"), and its values
//     on that day, saved as the file's. Transactions the account holder recorded on it are saved as typed.
//   · AN ACCOUNT LINKED TO A BROKER — nothing here. Its next update reads the broker's whole history once into the
//     record (snaptradeSync: an account the record holds nothing for is read from the start), so its purchases, sales
//     and dates come from the broker itself, not from a copy the old sync rebuilt.
//
// WHAT IT NEVER DOES.
//   · It never moves the old daily values. Their dates were the phone's (the fault his rulings of 2026-11-10 fix).
//   · It never moves an account twice: one the record already holds rows for is left alone, so a phone opened again,
//     or a second phone after the cloud has the record, adds nothing.
import { addRows, purchasesFromList, rowsInForce, sharesOnRecord, sortArriving, valueRows, dayOrNull, oneHoldingSpelling, type AssetRow, type NewRow, type ListQuestion, type EventQuestion } from './asset-record';
import { typedChangeToRecord, typedAccountRows, openingRow, givenNumber } from './asset-record-from-typed';
import { contractMultiplier, type Position } from '../../../src/domain/performance';
import type { Transaction } from '../../../src/domain/transactions';
import type { AssetAccount } from '../../../src/domain/assets';

export interface MoveResult {
  record: AssetRow[];
  /** The accounts moved, by id. */
  moved: string[];
  ask: { accountId: string; events: EventQuestion[]; lists: ListQuestion[] }[];
  problems: string[];
}

/** The transactions that move shares of a holding. */
const SHARE_MOVES: ReadonlySet<string> = new Set(['OPENING_POSITION', 'BUY', 'SELL', 'TRANSFER_IN_KIND']);

/** One holding's tax lots as a file's list, on the day of the list (the account's "Value as of"). */
function asFileList(out: MoveResult, id: string, h: string, listed: { date: string | null; shares: number; price: number | null }[], listDay: string | null, writtenAt: string): ListQuestion[] {
  if (!listed.length) return [];
  const got = purchasesFromList(out.record, id, h, listed, 'file', listDay);
  out.record = addRows(out.record, got.rows, writtenAt);
  return got.ask;
}

/** An imported account's values on the day of its list, as the file's. */
function fileValues(a: AssetAccount): NewRow[] {
  const holdings: { holding: string; shares: number | null; price: number | null; value: number | null }[] = [];
  for (const p of (a.positions ?? []) as Position[]) {
    const holding = oneHoldingSpelling(p.ticker);
    if (holding == null) continue;
    const per = contractMultiplier(p as any), asShares = p.kind === 'options' ? per : 1;
    const shares = (p.lots ?? []).reduce((t, l) => t + (givenNumber(l.shares) ?? 0), 0);
    const price = givenNumber(p.last_price);
    holdings.push({ holding, shares: shares * asShares, price, value: price == null ? null : shares * price * per });
  }
  return valueRows({ accountId: String(a.asset_id), date: dayOrNull((a as any).value_as_of), source: 'file', cash: givenNumber((a as any).cash_balance), holdings });
}

/** WHAT A PHONE HOLDS, moved onto the record for every account the record holds nothing for. */
export function moveOldCopies(record: readonly AssetRow[], accounts: readonly AssetAccount[], transactions: readonly Transaction[], writtenAt: string): MoveResult {
  const out: MoveResult = { record: [...record], moved: [], ask: [], problems: [] };
  const known = new Set(rowsInForce(record).map((r) => r.accountId));
  for (const a of accounts) {
    const id = String(a.asset_id);
    if (known.has(id) || a.source === 'connected') continue;
    const imported = (a.source as string) === 'imported';
    const listDay = dayOrNull((a as any).value_as_of);
    const events: EventQuestion[] = [], lists: ListQuestion[] = [];
    // the account holder's own transactions on it, oldest first
    const own = transactions.filter((t) => String(t.account_id) === id && t.source !== 'connected')
      .slice().sort((x, y) => String(x.date).localeCompare(String(y.date)) || String(x.created_at).localeCompare(String(y.created_at)));
    const holdingOf = (t: Transaction) => (SHARE_MOVES.has(t.type) ? oneHoldingSpelling(t.ticker ?? null) : null);
    const saveTyped = (t: Transaction) => {
      const opening = openingRow(t);
      if (opening) { const sorted = sortArriving(out.record, [opening]); out.record = addRows(out.record, sorted.save, writtenAt); events.push(...sorted.ask); return; }
      if (t.type === 'OPENING_POSITION') return;
      const got = typedChangeToRecord(out.record, { kind: 'transaction-recorded', transaction: t }, writtenAt);
      out.record = got.record; events.push(...got.ask); out.problems.push(...got.problems);
    };
    out.record = addRows(out.record, imported ? fileValues(a) : typedAccountRows(a), writtenAt);
    const fromLots = new Set<string>(), fromOpenings = new Set<string>();
    for (const p of (a.positions ?? []) as Position[]) {
      const h = oneHoldingSpelling(p.ticker);
      if (h == null) continue;
      const per = p.kind === 'options' ? contractMultiplier(p as any) : 1;
      const shown = (p.lots ?? []).reduce((t, l) => t + (givenNumber(l.shares) ?? 0), 0) * per;
      // the activity alone, on a record of its own, to see whether it adds up to the shares the holding shows
      let alone: AssetRow[] = [];
      for (const t of own.filter((x) => holdingOf(x) === h)) {
        const o = openingRow(t);
        alone = o ? addRows(alone, [o], writtenAt) : typedChangeToRecord(alone, { kind: 'transaction-recorded', transaction: t }, writtenAt).record;
      }
      if (Math.abs(sharesOnRecord(alone, id, h) - shown) <= 1e-9 && alone.length) {
        // the activity explains the lots: an imported account's first entries are the file's list, a typed one's are typed
        if (imported) {
          fromOpenings.add(h);
          lists.push(...asFileList(out, id, h, own.filter((x) => x.type === 'OPENING_POSITION' && holdingOf(x) === h)
            .map((x) => openingRow(x)).filter((r): r is NewRow => r != null).map((r) => ({ date: r.date, shares: r.shares as number, price: r.price ?? null })), listDay, writtenAt));
        }
        continue;
      }
      fromLots.add(h);
      if (imported) {
        lists.push(...asFileList(out, id, h, (p.lots ?? []).filter((l) => (givenNumber(l.shares) ?? 0) > 0)
          .map((l) => ({ date: dayOrNull(l.purchase_date), shares: Number(l.shares) * per, price: givenNumber(l.cost_per_share) })), listDay, writtenAt));
      } else {
        const got = typedChangeToRecord(out.record, { kind: 'holding-added', accountId: id, position: p }, writtenAt);
        out.record = got.record; events.push(...got.ask); out.problems.push(...got.problems);
      }
      const left = own.filter((x) => holdingOf(x) === h && x.type !== 'OPENING_POSITION').length;
      if (left) out.problems.push(`The activity of ${h} did not add up to its ${shown} shares, so its tax lots as they stand were moved and its ${left} recorded purchases and sales were not.`);
    }
    for (const t of own) {
      const h = holdingOf(t);
      if (h != null && fromLots.has(h)) continue;
      if (h != null && fromOpenings.has(h) && t.type === 'OPENING_POSITION') continue;
      saveTyped(t);
    }
    if (events.length || lists.length) out.ask.push({ accountId: id, events, lists });
    out.moved.push(id);
  }
  return out;
}
