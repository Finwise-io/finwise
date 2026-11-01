// ONE SHEET FRAME (NW3-18, FX-SHARED 2026-10-31; tenet 4, DEC-3523). Every sheet that rises from the bottom wears this frame and this handle,
// as Net worth v08 draws its sheets (approved 2026-10-01, DEC-0644): the grey of frames F and G, top corners 24, a handle 36 × 4 in the light
// grey with 10 below it. The account page's sheets were white with corners 22 and a 38 × 5 handle, or grey with a 40 × 4 one; Net worth's a
// third, 38 × 4. One exception keeps its approval: the change walk (v08 frame E) is drawn white, so its sheet sets white over this frame.
// src/__tests__/one_sheet_frame.test.tsx holds every sheet in the app to it.
import { Colors } from '../utils/theme';

export const SHEET_FRAME = { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24 } as const;
export const SHEET_HANDLE = { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.bgTertiary, alignSelf: 'center', marginBottom: 10 } as const;
