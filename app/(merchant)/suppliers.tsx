import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, ChevronRight, Plus, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Screen,
  SegmentedControl,
  Sheet,
  Skeleton,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import {
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useSaveSupplier,
  useSuppliers,
} from '@/features/suppliers/hooks';
import { formatDayLabel, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import type { PurchaseOrderStatus } from '@/types/models';

type Tab = 'suppliers' | 'orders';

const PO_BADGE: Record<PurchaseOrderStatus, { labelKey: string; tone: 'positive' | 'caution' | 'neutral' | 'info' }> = {
  draft: { labelKey: 'suppliers.statusDraft', tone: 'neutral' },
  ordered: { labelKey: 'suppliers.statusOrdered', tone: 'info' },
  received: { labelKey: 'suppliers.statusReceived', tone: 'positive' },
  cancelled: { labelKey: 'suppliers.statusCancelled', tone: 'neutral' },
};

export default function SuppliersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');

  const suppliersQuery = useSuppliers();
  const poQuery = usePurchaseOrders();
  const saveSupplier = useSaveSupplier();
  const receivePo = useReceivePurchaseOrder();

  const [tab, setTab] = useState<Tab>('suppliers');
  const supplierSheet = useSheetRef();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');

  const suppliers = suppliersQuery.data ?? [];
  const purchaseOrders = poQuery.data ?? [];
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? t('suppliers.tabSuppliers');

  const submitSupplier = () => {
    if (name.trim().length < 2) {
      toast.error(t('suppliers.nameNeeded'), t('suppliers.nameNeededBody'));
      return;
    }
    saveSupplier.mutate(
      { name: name.trim(), contact: contact.trim() || null, notes: notes.trim() },
      {
        onSuccess: (s) => {
          toast.success(t('suppliers.supplierAdded'), s.name);
          setName('');
          setContact('');
          setNotes('');
          supplierSheet.current?.dismiss();
        },
      },
    );
  };

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
          <Text variant="h1" weight="bold">
            {t('suppliers.title')}
          </Text>
        </View>
        <IconButton
          icon={Plus}
          variant="tonal"
          accessibilityLabel={t('suppliers.addSupplier')}
          onPress={() => supplierSheet.current?.present()}
        />
      </View>

      <View className="px-5 py-3">
        <SegmentedControl
          options={[
            { label: t('suppliers.tabSuppliers'), value: 'suppliers' },
            { label: t('suppliers.tabOrders'), value: 'orders' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'suppliers' ? (
        suppliersQuery.isLoading ? (
          <View className="gap-3 px-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={72} radius={20} />
            ))}
          </View>
        ) : suppliers.length === 0 ? (
          <View className="flex-1 justify-center pb-16">
            <EmptyState
              icon={Building2}
              title={t('suppliers.emptyTitle')}
              message={t('suppliers.emptyMsg')}
              actionLabel={t('suppliers.addSupplier')}
              onAction={() => supplierSheet.current?.present()}
            />
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerClassName="gap-2.5 px-5 pb-16" showsVerticalScrollIndicator={false}>
            {suppliers.map((supplier, index) => (
              <Animated.View
                key={supplier.id}
                entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}
              >
                <Card
                  padded={false}
                  className="flex-row items-center gap-3 px-4 py-3.5"
                  onPress={() => router.push({ pathname: '/supplier/[id]', params: { id: supplier.id } })}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-tint">
                    <Building2 size={18} color={colors.primary} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text variant="body" weight="semibold">
                      {supplier.name}
                    </Text>
                    {supplier.contact ? (
                      <Text variant="caption" tone="tertiary" numberOfLines={1}>
                        {supplier.contact}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
                </Card>
              </Animated.View>
            ))}
          </ScrollView>
        )
      ) : poQuery.isLoading ? (
        <View className="gap-3 px-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={88} radius={20} />
          ))}
        </View>
      ) : purchaseOrders.length === 0 ? (
        <View className="flex-1 justify-center pb-16">
          <EmptyState
            icon={Truck}
            title={t('suppliers.noPos')}
            message={t('suppliers.noPosMsg')}
          />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-2.5 px-5 pb-16" showsVerticalScrollIndicator={false}>
          {purchaseOrders.map((po, index) => {
            const badge = PO_BADGE[po.status];
            const units = po.items.reduce((sum, i) => sum + i.qty, 0);
            return (
              <Animated.View
                key={po.id}
                entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}
              >
                <Card className="gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text variant="body" weight="semibold">
                        {supplierName(po.supplierId)}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {t('suppliers.units', { count: units })} · {formatDayLabel(new Date(po.createdAt))}
                      </Text>
                    </View>
                    <Badge label={t(badge.labelKey)} tone={badge.tone} dot={po.status === 'ordered'} />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Text variant="title" weight="semibold" tabular>
                      {formatMoney(po.totalCost, currency)}
                    </Text>
                    {po.status === 'ordered' ? (
                      <Button
                        label={t('suppliers.receiveStock')}
                        size="sm"
                        loading={receivePo.isPending}
                        onPress={() =>
                          receivePo.mutate(po.id, {
                            onSuccess: () =>
                              toast.success(
                                t('suppliers.stockReceived'),
                                t('suppliers.unitsAdded', { count: units }),
                              ),
                          })
                        }
                      />
                    ) : null}
                  </View>
                </Card>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <Sheet ref={supplierSheet} title={t('suppliers.addSupplier')}>
        <View className="gap-4">
          <TextField label={t('suppliers.supplierName')} value={name} onChangeText={setName} autoFocus />
          <TextField label={t('suppliers.contact')} value={contact} onChangeText={setContact} />
          <TextField label={t('suppliers.notes')} value={notes} onChangeText={setNotes} multiline />
          <Button
            label={t('suppliers.addSupplier')}
            size="lg"
            fullWidth
            loading={saveSupplier.isPending}
            onPress={submitSupplier}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
