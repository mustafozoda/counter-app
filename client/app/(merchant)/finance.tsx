import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Plus,
  ReceiptText,
  Share2,
  Wallet,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CashflowBars } from '@/components/charts/cashflow-bars';
import {
  Button,
  Card,
  Chip,
  CurrencyText,
  EmptyState,
  IconButton,
  ProgressBar,
  Screen,
  SegmentedControl,
  Sheet,
  Skeleton,
  StatCard,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { summarize, type FinancePeriod } from '@/features/finance/aggregate';
import {
  EXPENSE_CATEGORIES,
  useAddExpense,
  useTransactions,
} from '@/features/finance/hooks';
import { useOrders } from '@/features/pos/hooks';
import { toCsv } from '@/lib/csv';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Transaction } from '@/types/models';

export default withPermission(FinanceScreen, 'view_finance');

function FinanceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');

  const periodOptions: { label: string; value: FinancePeriod }[] = [
    { label: t('home.today'), value: 'today' },
    { label: t('home.week'), value: 'week' },
    { label: t('home.month'), value: 'month' },
  ];

  const transactionsQuery = useTransactions();
  const ordersQuery = useOrders();
  const addExpense = useAddExpense();

  const [period, setPeriod] = useState<FinancePeriod>('week');
  const expenseSheet = useSheetRef();

  const [category, setCategory] = useState<string>('inventory');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
  const summary = useMemo(
    () => summarize(transactions, ordersQuery.data ?? [], period),
    [transactions, ordersQuery.data, period],
  );

  const ledger = useMemo(() => transactions.slice(0, 30), [transactions]);
  const loading = transactionsQuery.isLoading || ordersQuery.isLoading;

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) setReceiptUri(uri);
  };

  const submitExpense = () => {
    const parsed = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t('finance.enterAmount'));
      return;
    }
    addExpense.mutate(
      { category, amount: parsed, note: note.trim(), receiptUri },
      {
        onSuccess: () => {
          toast.success(t('finance.expenseRecorded'), `${t('category.' + category)} · ${formatMoney(parsed, currency)}`);
          setAmount('');
          setNote('');
          setReceiptUri(null);
          expenseSheet.current?.dismiss();
        },
      },
    );
  };

  const exportLedger = async () => {
    try {
      const rows: (string | number | null)[][] = [['Date', 'Type', 'Category', 'Amount', 'Note']];
      for (const txn of transactions) {
        rows.push([formatDateTime(new Date(txn.date)), txn.type, t('category.' + txn.category), txn.amount, txn.note]);
      }
      const file = new File(Paths.cache, `counter-ledger-${Date.now()}.csv`);
      file.write(toCsv(rows));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('finance.exportLedger') });
      }
    } catch {
      toast.error(t('finance.exportFailed'));
    }
  };

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-1 flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
          <Text variant="h1" weight="bold" numberOfLines={1} className="flex-1">
            {t('finance.title')}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <IconButton icon={Share2} accessibilityLabel={t('finance.exportLedger')} onPress={() => void exportLedger()} />
          <IconButton
            icon={Plus}
            variant="tonal"
            accessibilityLabel={t('finance.addExpense')}
            onPress={() => expenseSheet.current?.present()}
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        <View className="pt-3">
          <SegmentedControl options={periodOptions} value={period} onChange={setPeriod} />
        </View>

        {loading ? (
          <View className="mt-4 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={110} radius={20} />
            ))}
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-4">
              <Card className="gap-1">
                <Text variant="caption" weight="medium" tone="secondary">
                  {t('finance.profit', { period: t('home.' + period) })}
                </Text>
                <CurrencyText
                  amount={summary.profit}
                  currency={currency}
                  variant="display"
                  animated
                  tone={summary.profit >= 0 ? 'positive' : 'negative'}
                />
                <Text variant="caption" tone="tertiary">
                  {t('finance.profitCaption')}
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(40).springify().damping(18)} className="mt-3 flex-row gap-3">
              <StatCard
                label={t('finance.revenue')}
                value={summary.revenue}
                currency={currency}
                delta={summary.revenueDelta ?? undefined}
                sparkline={summary.revenueTrend}
                className="flex-1"
              />
              <Card className="flex-1 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text variant="caption" weight="medium" tone="secondary">
                    {t('finance.expenses')}
                  </Text>
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-negative-tint">
                    <ArrowUpRight size={16} color={colors.negative} strokeWidth={2} />
                  </View>
                </View>
                <CurrencyText amount={summary.expenses} currency={currency} variant="displaySm" animated />
                <Text variant="micro" tone="tertiary">
                  {t('finance.categoriesCount', { count: summary.expenseByCategory.length })}
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} className="mt-3">
              <Card className="gap-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="caption" weight="medium" tone="secondary">
                    {t('finance.cashFlow')}
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1">
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.positive }} />
                      <Text variant="micro" tone="tertiary">
                        {t('finance.in')}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.negative }} />
                      <Text variant="micro" tone="tertiary">
                        {t('finance.out')}
                      </Text>
                    </View>
                  </View>
                </View>
                <CashflowBars data={summary.cashflow} />
                <View className="flex-row justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <ArrowDownLeft size={14} color={colors.positive} strokeWidth={2.5} />
                    <Text variant="caption" weight="medium" tone="positive" tabular>
                      {formatMoney(summary.moneyIn, currency)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <ArrowUpRight size={14} color={colors.negative} strokeWidth={2.5} />
                    <Text variant="caption" weight="medium" tone="negative" tabular>
                      {formatMoney(summary.moneyOut, currency)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>

            {summary.expenseByCategory.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} className="mt-3">
                <Card className="gap-3">
                  <Text variant="caption" weight="medium" tone="secondary">
                    {t('finance.whereMoneyWent')}
                  </Text>
                  {summary.expenseByCategory.slice(0, 5).map((entry) => (
                    <View key={entry.category} className="gap-1.5">
                      <View className="flex-row items-center justify-between">
                        <Text variant="caption" weight="medium">
                          {t('category.' + entry.category)}
                        </Text>
                        <Text variant="caption" tone="secondary" tabular>
                          {formatMoney(entry.amount, currency)}
                        </Text>
                      </View>
                      <ProgressBar
                        progress={summary.expenses > 0 ? entry.amount / summary.expenses : 0}
                        tone={entry.category === 'refunds' ? 'caution' : 'negative'}
                        height={5}
                      />
                    </View>
                  ))}
                </Card>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} className="mt-6 gap-3">
              <Text variant="h2" weight="semibold">
                {t('finance.ledger')}
              </Text>
              {ledger.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title={t('finance.noTransactions')}
                  message={t('finance.noTransactionsBody')}
                  actionLabel={t('finance.addExpenseCta')}
                  onAction={() => expenseSheet.current?.present()}
                />
              ) : (
                <Card padded={false}>
                  {ledger.map((t, index) => (
                    <LedgerRow key={t.id} transaction={t} currency={currency} last={index === ledger.length - 1} />
                  ))}
                </Card>
              )}
            </Animated.View>
          </>
        )}
      </ScrollView>

      <Sheet ref={expenseSheet} title={t('finance.addExpense')}>
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <Chip key={c} label={t('category.' + c)} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
          <TextField
            label={t('finance.amount')}
            value={amount}
            onChangeText={(v) => setAmount(v.replace(',', '.'))}
            keyboardType="decimal-pad"
          />
          <TextField label={t('finance.noteOptional')} value={note} onChangeText={setNote} />
          <View className="flex-row items-center gap-3">
            <Button
              label={receiptUri ? t('finance.changeReceipt') : t('finance.attachReceipt')}
              variant="secondary"
              icon={ReceiptText}
              onPress={() => void pickReceipt()}
            />
            {receiptUri ? (
              <Image source={{ uri: receiptUri }} style={{ width: 44, height: 44, borderRadius: 10 }} contentFit="cover" />
            ) : null}
          </View>
          <Button
            label={t('finance.recordExpense')}
            size="lg"
            fullWidth
            loading={addExpense.isPending}
            onPress={submitExpense}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

function LedgerRow({
  transaction,
  currency,
  last,
}: {
  transaction: Transaction;
  currency: string;
  last: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const income = transaction.type === 'income';
  return (
    <View className={`flex-row items-center gap-3 px-4 py-3 ${last ? '' : 'border-b border-hairline'}`}>
      <View
        className="h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: income ? colors.positiveTint : colors.negativeTint }}
      >
        {income ? (
          <ArrowDownLeft size={16} color={colors.positive} strokeWidth={2} />
        ) : (
          <ArrowUpRight size={16} color={colors.negative} strokeWidth={2} />
        )}
      </View>
      <View className="flex-1">
        <Text variant="body" weight="medium">
          {t('category.' + transaction.category)}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {transaction.note ? `${transaction.note} · ` : ''}
          {formatDateTime(new Date(transaction.date))}
        </Text>
      </View>
      <Text variant="body" weight="semibold" tone={income ? 'positive' : 'negative'} tabular>
        {income ? '+' : '-'}
        {formatMoney(transaction.amount, currency)}
      </Text>
    </View>
  );
}
