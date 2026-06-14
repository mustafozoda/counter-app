import { useRouter } from 'expo-router';
import { ArrowLeft, Check, ShieldCheck, Trash2, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PressableScale,
  Screen,
  Sheet,
  SwipeableRow,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import {
  ROLE_PERMISSIONS,
  useStaffStore,
  type Permission,
} from '@/stores/staff';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import type { StaffRole } from '@/types/models';

const ROLES: { value: StaffRole; labelKey: string; tone: 'accent' | 'info' | 'neutral' }[] = [
  { value: 'owner', labelKey: 'roles.owner', tone: 'accent' },
  { value: 'manager', labelKey: 'roles.manager', tone: 'info' },
  { value: 'cashier', labelKey: 'roles.cashier', tone: 'neutral' },
];

const PERMISSION_LABEL_KEY: Record<Permission, string> = {
  sell: 'staff.permSell',
  manage_inventory: 'staff.permInventory',
  view_finance: 'staff.permFinance',
  manage_staff: 'staff.permStaff',
  manage_settings: 'staff.permSettings',
};

export default function StaffScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const members = useStaffStore((s) => s.members);
  const saveMember = useStaffStore((s) => s.saveMember);
  const removeMember = useStaffStore((s) => s.removeMember);

  const sheet = useSheetRef();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('cashier');

  const openNew = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('cashier');
    sheet.current?.present();
  };

  const submit = () => {
    if (name.trim().length < 2) {
      toast.error(t('staff.nameNeeded'), t('staff.nameNeededBody'));
      return;
    }
    saveMember({ id: editingId ?? undefined, name: name.trim(), email: email.trim(), role });
    toast.success(editingId ? t('staff.memberUpdated') : t('staff.memberAdded'), name.trim());
    sheet.current?.dismiss();
  };

  const confirmRemove = (id: string, label: string) =>
    Alert.alert(t('staff.removeMember'), t('staff.removeBody', { name: label }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('actions.remove'), style: 'destructive', onPress: () => removeMember(id) },
    ]);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
          <Text variant="h1" weight="bold">
            {t('staff.title')}
          </Text>
        </View>
        <IconButton icon={UserPlus} variant="tonal" accessibilityLabel={t('staff.addTeamMember')} onPress={openNew} />
      </View>

      {members.length === 0 ? (
        <View className="flex-1 justify-center pb-16">
          <EmptyState
            icon={ShieldCheck}
            title={t('staff.buildTeam')}
            message={t('staff.buildMsg')}
            actionLabel={t('staff.addAMember')}
            onAction={openNew}
          />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-2.5 px-5 pb-16 pt-3" showsVerticalScrollIndicator={false}>
          {members.map((member, index) => {
            const roleMeta = ROLES.find((r) => r.value === member.role)!;
            return (
              <Animated.View
                key={member.id}
                entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}
              >
                <SwipeableRow
                  actions={[{ icon: Trash2, label: t('actions.remove'), tone: 'negative', onPress: () => confirmRemove(member.id, member.name) }]}
                >
                  <Card
                    padded={false}
                    className="flex-row items-center gap-3 px-4 py-3.5"
                    onPress={() => {
                      setEditingId(member.id);
                      setName(member.name);
                      setEmail(member.email);
                      setRole(member.role);
                      sheet.current?.present();
                    }}
                  >
                    <Avatar name={member.name} size={44} />
                    <View className="flex-1">
                      <Text variant="body" weight="semibold">
                        {member.name}
                      </Text>
                      <Text variant="caption" tone="tertiary" numberOfLines={1}>
                        {member.email || t('staff.noEmail')}
                      </Text>
                    </View>
                    <Badge label={t(roleMeta.labelKey)} tone={roleMeta.tone} />
                  </Card>
                </SwipeableRow>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <Sheet ref={sheet} title={editingId ? t('staff.editTeamMember') : t('staff.newTeamMember')}>
        <View className="gap-4">
          <TextField label={t('staff.name')} value={name} onChangeText={setName} autoFocus={!editingId} />
          <TextField label={t('staff.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text variant="caption" weight="medium" tone="tertiary" className="px-1">
            {t('staff.role')}
          </Text>
          <View className="gap-2">
            {ROLES.map((option) => {
              const selected = role === option.value;
              return (
                <PressableScale
                  key={option.value}
                  scaleTo={0.98}
                  haptic="selection"
                  onPress={() => setRole(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`gap-2 rounded-md border p-4 ${selected ? 'border-primary bg-primary-tint' : 'border-hairline bg-surface dark:bg-surface-elevated'}`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text variant="body" weight="semibold" tone={selected ? 'accent' : 'primary'}>
                      {t(option.labelKey)}
                    </Text>
                    {selected ? <Check size={18} color={colors.primary} strokeWidth={2.5} /> : null}
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    {ROLE_PERMISSIONS[option.value].map((permission: Permission) => (
                      <View key={permission} className="rounded-full bg-surface-sunken px-2 py-0.5 dark:bg-surface">
                        <Text variant="micro" tone="secondary">
                          {t(PERMISSION_LABEL_KEY[permission])}
                        </Text>
                      </View>
                    ))}
                  </View>
                </PressableScale>
              );
            })}
          </View>

          <Button label={editingId ? t('common.saveChanges') : t('staff.addTeamMember')} size="lg" fullWidth onPress={submit} />
        </View>
      </Sheet>
    </Screen>
  );
}
