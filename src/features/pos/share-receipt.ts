import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { i18n } from '@/i18n';
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
        dialogTitle: `${i18n.t('receipt.title')} ${order.number}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      toast.info(i18n.t('receipt.saved'), i18n.t('common.sharingUnavailable'));
    }
  } catch {
    toast.error(i18n.t('receipt.couldNotCreate'));
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
