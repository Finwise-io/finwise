// A QUESTION FROM THE MASTER RECORD, ASKED BESIDE THE FIGURE IT CHANGES (account-page v02 rows 1, 2 and 4; holding-detail
// v03 rows 1 to 4, 2026-11-12). The app's one amber box: a headline naming who asks, the record's own sentence, each choice a
// 44-point button whose second line says what that choice makes, the line of what stands until he answers. After an answer,
// one quiet line in the same place: what was answered and the day, and "Change your answer ›". Every sentence comes from the
// record (asset-record.ts, through src/domain/assets/recordQuestions.ts); this component writes none of its own.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Radii, Spacing } from '../utils/theme';
import { dateShown } from '../domain/_shared/dates';
import type { AssetQuestion, AssetRow } from '../../MoneyKeel/functions/networth-and-performance/asset-record';
import { choiceMakes, choiceTitle, questionFootLine, questionHeadline, type AnswerShown, type QuestionAccount } from '../domain/assets/recordQuestions';

/** The questions this phone has shown since it opened, by name — so an answer can be changed even where the record no longer
 *  raises the question by itself (its stored copy is dropped once answered). */
export const QUESTIONS_SHOWN = new Map<string, AssetQuestion>();

/** The choices in the drawing's order: a sale's purchases newest first, one with no date last (holding-detail v03 state G); any
 *  other question's as the record gives them. */
const choiceOrder = (q: AssetQuestion) => (q.kind !== 'S1' ? q.choices : [...q.choices].sort((a, b) => {
  const da = q.sale?.choices.find((x) => `purchase:${x.firstRowId}` === a.id)?.date ?? '', db = q.sale?.choices.find((x) => `purchase:${x.firstRowId}` === b.id)?.date ?? '';
  return db.localeCompare(da);
}));
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function RecordQuestionCard({ question, account, record, price = null, onAnswer, testID }: {
  question: AssetQuestion; account: QuestionAccount; record: readonly AssetRow[]; price?: number | null;
  onAnswer: (choiceId: string, date?: string) => void; testID?: string;
}) {
  QUESTIONS_SHOWN.set(question.name, question);
  const [picking, setPicking] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const foot = questionFootLine(record, question, account);
  return (
    <View style={s.box} testID={testID ?? 'record-question'}>
      <Text style={s.head}>{questionHeadline(question, account, record)}</Text>
      <Text style={s.sentence}>{question.sentence}</Text>
      {choiceOrder(question).map((c) => {
        const makes = choiceMakes(record, question, c.id, account, price);
        const title = choiceTitle(record, question, c);
        const needsDay = question.kind === 'V2' && c.id === 'date';
        return (
          <TouchableOpacity key={c.id} accessibilityRole="button" style={s.choice}
            accessibilityLabel={`${title.replace(/ ›$/, '')}${makes ? `: ${makes}` : ''}`}
            onPress={() => (needsDay ? setPicking((v) => !v) : onAnswer(c.id))}>
            <Text style={s.choiceT}>{title}</Text>
            {!!makes && <Text style={s.choiceS}>{makes}</Text>}
          </TouchableOpacity>
        );
      })}
      {picking && (
        <>
          <DateTimePicker testID="record-question-day" value={day ? new Date(`${day}T12:00:00`) : new Date()} mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()}
            onChange={(e: any, d?: Date) => { if (e?.type === 'dismissed' || !d) return; setDay(isoOf(d)); }} />
          {day != null && (
            <TouchableOpacity accessibilityRole="button" style={s.choice} accessibilityLabel={`Save ${dateShown(day)}`}
              onPress={() => { setPicking(false); onAnswer('date', day); }}>
              <Text style={s.choiceT}>Save {dateShown(day)}</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      {!!foot && <Text style={s.foot}>{foot}</Text>}
    </View>
  );
}

/** THE LINE AN ANSWER LEAVES IN ITS QUESTION'S PLACE (account-page v02 row 4; holding-detail v03 row 4). "Change your answer ›"
 *  asks the question again; it is drawn only where the question can be asked again. */
export function AnsweredLine({ answer, onChange, testID }: { answer: AnswerShown; onChange: () => void; testID?: string }) {
  return (
    <View style={s.answered} testID={testID ?? 'record-answered'}>
      <Text style={s.answeredT}>✓ Answered {answer.day}: {answer.words}</Text>
      {answer.question != null && (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Change your answer" onPress={onChange} style={s.changeBtn}>
          <Text style={s.changeT}>Change your answer ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // the app's one amber box of missing information (DataGapsBanner, account page v01 .warnb): 12-point corners, 10 inside above
  // and below, 12 at the sides
  box: { backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber, borderRadius: Radii.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginVertical: Spacing.sm },
  head: { fontSize: 13, fontWeight: '700', color: Colors.amber },
  sentence: { fontSize: 13, color: Colors.textPrimary, marginTop: 4, lineHeight: 18 },
  // every choice its own 44-point button (DEC-9523), its second line what it makes
  choice: { minHeight: 44, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primaryDeep, borderRadius: Radii.md, paddingHorizontal: 12, paddingVertical: 6, justifyContent: 'center', marginTop: 8 },
  choiceT: { fontSize: 13, fontWeight: '800', color: Colors.primaryDeep },
  choiceS: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  foot: { fontSize: 11, color: Colors.textTertiary, marginTop: 8, lineHeight: 16 },
  answered: { marginVertical: Spacing.sm },
  answeredT: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  changeBtn: { minHeight: 44, justifyContent: 'center' },
  changeT: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
