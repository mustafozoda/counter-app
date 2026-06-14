import { createContext } from 'react';

/**
 * True for descendants rendered inside a bottom `Sheet`. Lets inputs (TextField)
 * switch to gorhom's `BottomSheetTextInput`, so the sheet lifts itself above the
 * keyboard and the focused field stays visible.
 */
export const InsideSheetContext = createContext(false);
