// EVERY STORED DATE IS WRITTEN IN WORDS, THROUGH THE ONE DATE WRITER (2026-10-19).
//   A bond's maturity date printed as "2027-03-31" on two screens (Itemize: "Bond · matures 2027-03-31"; the account
//   page's BOND FACTS: "Matures 2027-03-31 (… away)") while every other date on those screens read "Mar 31, 2027", and
//   the account page's "Value as of 2026-06-02" the same. The date writer is MK-ST-F-078 dateShown
//   (src/domain/_shared/dates.ts). This guard reads every screen and component file and fails when a stored date —
//   a maturity date, a value date, the start of an account's history — is put straight into text: a template
//   `${x.maturity}` or a JSX child `{x.value_as_of}`. Passing the same value to a date writer, or to a prop such as a
//   date picker's value={…}, is not text and is not flagged.
//   It proves it looked: it counts the files it read and every mention of those fields it saw.
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = ['src/screens', 'src/components'];
// `date` added 2026-10-22: a record's own day (a buy, a dividend, an income, a saved plan) printed "2026-08-02" on the activity
// sheet and the edit sheet for a record you entered, and on two more screens, while the guard looked only at the fields above
const FIELDS = ['maturity', 'maturityDate', 'maturity_date', 'nextMaturity', 'value_as_of', 'valueAsOf', 'history_start', 'history_start_override', 'last_synced', 'date'];
const FIELD = FIELDS.join('|');
// a value used as-is: `x`, `a.b`, `a?.b.c` whose last name is one of the date fields
const BARE = new RegExp(`(\\$?)\\{\\s*((?:[A-Za-z_$][\\w$]*\\??\\.)*(?:${FIELD}))\\s*\\}`, 'g');
const MENTION = new RegExp(`\\b(?:${FIELD})\\b`, 'g');
// the same value wrapped only to make it a string — `{String(row.date)}` — is still the stored form
const WRAPPED = new RegExp(`(\\$?)\\{\\s*String\\(\\s*((?:[A-Za-z_$][\\w$]*\\??\\.)*(?:${FIELD}))\\s*(?:\\?\\?\\s*'')?\\s*\\)(?:\\.slice\\(0,\\s*10\\))?\\s*\\}`, 'g');
const RECORD_DATE = /\.date\b/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__') walk(p, out); }
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Every place in one file's source where a stored date goes into text as-is. */
function rawDates(src: string): string[] {
  const hits: string[] = [];
  for (const m of [...src.matchAll(BARE), ...src.matchAll(WRAPPED)]) {
    const before = src.slice(0, m.index).replace(/\s+$/, '');
    const isTemplate = m[1] === '$';
    const isProp = !isTemplate && before.endsWith('=');   // value={maturity} hands it to a control, not to text
    // a template that is a React key (key={`${sale.date}-${i}`}) names a row to React; no one reads it
    const isKey = isTemplate && src.slice(0, src.lastIndexOf('`', m.index!)).replace(/\s+$/, '').endsWith('key={');
    if (!isProp && !isKey) hits.push(m[0]);
  }
  return hits;
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));

test('the guard reads every screen and component file, and sees the date fields in them', () => {
  // 86 .tsx files under src/screens + src/components on 2026-10-19 (tests excluded); a floor, so a walk that
  // stops finding them goes red rather than quiet
  expect(files.length).toBeGreaterThanOrEqual(86);
  const mentions = files.reduce((n, f) => n + (fs.readFileSync(f, 'utf8').match(MENTION)?.length ?? 0), 0);
  // the fields are read and written on these screens; seeing none would mean the pattern no longer matches the code
  expect(mentions).toBeGreaterThanOrEqual(40);
  // and a record's own day: 54 mentions of `.date` on 2026-10-22, six of them already through dateShown
  const recordDates = files.reduce((n, f) => n + (fs.readFileSync(f, 'utf8').match(RECORD_DATE)?.length ?? 0), 0);
  expect(recordDates).toBeGreaterThanOrEqual(50);
});

test('the guard catches the shapes it is for, and leaves a date writer or a date picker alone', () => {
  expect(rawDates("`Bond · matures ${h.maturityDate}`")).toEqual(['${h.maturityDate}']);
  expect(rawDates("`${one.maturity} (matured)`")).toEqual(['${one.maturity}']);
  expect(rawDates("`Value as of ${account.value_as_of}`")).toEqual(['${account.value_as_of}']);
  expect(rawDates('<Text>{a?.history_start}</Text>')).toEqual(['{a?.history_start}']);
  expect(rawDates("`matures ${dateShown(h.maturityDate)}`")).toEqual([]);
  expect(rawDates('<DateField value={maturity} />')).toEqual([]);
  expect(rawDates("{ maturity_date: maturity || undefined }")).toEqual([]);
  // a record's day (2026-10-22): the two sheet lines as they were, and the shapes left alone
  expect(rawDates('<Text style={styles.hMeta}>{t.date} · {acctName(t.account_id)}</Text>')).toEqual(['{t.date}']);
  expect(rawDates('<Text style={sh.note}>{String(row.date)} · correcting it reverses the old amount</Text>')).toEqual(['{String(row.date)}']);
  expect(rawDates('`Restores the plan saved ${prev.date} (${prev.label}).`')).toEqual(['${prev.date}']);
  expect(rawDates('<Text>{dateShown(t.date)} · {acctName(t.account_id)}</Text>')).toEqual([]);
  expect(rawDates('<SaidText key={`${sale.date}-${i}`} style={s.noteLine}>')).toEqual([]);
  expect(rawDates('<DateField value={date} onChange={setDate} />')).toEqual([]);
});

test('no screen or component prints a maturity date, value date or history start raw', () => {
  const found: string[] = [];
  for (const f of files) {
    for (const h of rawDates(fs.readFileSync(f, 'utf8'))) found.push(`${path.relative(ROOT, f)}: ${h}`);
  }
  // write it through dateShown (src/domain/_shared/dates.ts): "Mar 31, 2027", never "2027-03-31"
  expect(found).toEqual([]);
});
