import type { OrderWithPayments } from '@/api/orders';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { PaymentMethod, Store } from '@/types/models';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
  installment: 'Installment',
};

/** Plain-text receipt — for quick share via the system sheet. */
export function buildReceiptText(order: OrderWithPayments, store: Store): string {
  const c = store.currencyCode;
  const lines: string[] = [
    store.receipt.headerText || store.name,
    `Order ${order.number} · ${formatDateTime(new Date(order.createdAt))}`,
    '——————————————',
  ];
  for (const item of order.items) {
    const label = item.variantLabel !== 'Default' ? ` (${item.variantLabel})` : '';
    lines.push(`${item.qty} × ${item.productName}${label}`);
    lines.push(`    ${formatMoney(item.lineTotal, c)}`);
  }
  lines.push('——————————————');
  lines.push(`Subtotal  ${formatMoney(order.subtotal, c)}`);
  if (order.discount > 0) lines.push(`Discount  -${formatMoney(order.discount, c)}`);
  if (order.tax > 0) lines.push(`Tax       ${formatMoney(order.tax, c)}`);
  lines.push(`TOTAL     ${formatMoney(order.total, c)}`);
  for (const payment of order.payments) {
    lines.push(`${PAYMENT_METHOD_LABELS[payment.method]}  ${formatMoney(payment.amount, c)}`);
  }
  if (store.receipt.footerText) {
    lines.push('——————————————');
    lines.push(store.receipt.footerText);
  }
  return lines.join('\n');
}

/** Styled HTML receipt for expo-print → PDF (80mm slip proportions). */
export function buildReceiptHtml(order: OrderWithPayments, store: Store): string {
  const c = store.currencyCode;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const itemRows = order.items
    .map((item) => {
      const label = item.variantLabel !== 'Default' ? `<div class="muted">${esc(item.variantLabel)}</div>` : '';
      return `<tr>
        <td>${item.qty} × ${esc(item.productName)}${label}</td>
        <td class="num">${esc(formatMoney(item.lineTotal, c))}</td>
      </tr>`;
    })
    .join('');

  const totalRow = (label: string, value: string, strong = false) =>
    `<tr class="${strong ? 'total' : ''}"><td>${label}</td><td class="num">${esc(value)}</td></tr>`;

  const paymentRows = order.payments
    .map((p) => totalRow(PAYMENT_METHOD_LABELS[p.method], formatMoney(p.amount, c)))
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: 80mm auto; margin: 0; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
           width: 72mm; margin: 0 auto; padding: 6mm 0; color: #16151A; font-size: 11px; }
    h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
    .sub { text-align: center; color: #6B6A73; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 3px 0; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .muted { color: #6B6A73; font-size: 10px; }
    .rule td { border-top: 1px dashed #9C9AA3; padding: 0; height: 6px; }
    .total td { font-weight: 700; font-size: 13px; padding-top: 6px; }
    .footer { text-align: center; color: #6B6A73; margin-top: 10px; }
  </style></head><body>
    <h1>${esc(store.receipt.headerText || store.name)}</h1>
    <div class="sub">Order ${esc(order.number)} · ${esc(formatDateTime(new Date(order.createdAt)))}</div>
    <table>
      ${itemRows}
      <tr class="rule"><td colspan="2"></td></tr>
      ${totalRow('Subtotal', formatMoney(order.subtotal, c))}
      ${order.discount > 0 ? totalRow('Discount', `-${formatMoney(order.discount, c)}`) : ''}
      ${order.tax > 0 ? totalRow('Tax', formatMoney(order.tax, c)) : ''}
      ${totalRow('Total', formatMoney(order.total, c), true)}
      <tr class="rule"><td colspan="2"></td></tr>
      ${paymentRows}
    </table>
    ${store.receipt.footerText ? `<div class="footer">${esc(store.receipt.footerText)}</div>` : ''}
  </body></html>`;
}
