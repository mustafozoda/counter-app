import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import type { OrderWithPayments } from '@/api/orders';
import { toast } from '@/stores/toast';
import type { Store } from '@/types/models';

import { buildReceiptHtml, buildReceiptText } from './receipt';

/** Render the receipt to PDF and hand it to the system share sheet. */
export async function shareReceiptPdf(order: OrderWithPayments, store: Store): Promise<void> {
  try {
    const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml(order, store) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receipt ${order.number}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      toast.info('Receipt saved', 'Sharing is not available on this device.');
    }
  } catch {
    toast.error('Could not create receipt');
  }
}

/** Plain-text fallback (SMS, chat apps). */
export async function shareReceiptText(order: OrderWithPayments, store: Store): Promise<void> {
  try {
    await Share.share({ message: buildReceiptText(order, store) });
  } catch {
    // User dismissed the sheet — nothing to do.
  }
}
