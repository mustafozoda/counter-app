import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Button, Card, IconButton, PressableScale, Screen, SwitchRow, Text } from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { haptics } from '@/lib/haptics';
import {
  ASSIGNABLE_PERMISSIONS,
  roleHasPermission,
  useStaffStore,
  type Permission,
} from '@/stores/staff';
import { toast } from '@/stores/toast';

const PERMISSION_META: Record<string, { labelKey: string; captionKey: string }> = {
  sell: { labelKey: 'staff.permSell', captionKey: 'staff.permSellCaption' },
  manage_inventory: { labelKey: 'staff.permInventory', captionKey: 'staff.permInventoryCaption' },
  view_finance: { labelKey: 'staff.permFinance', captionKey: 'staff.permFinanceCaption' },
  use_assistant: { labelKey: 'staff.permAssistant', captionKey: 'staff.permAssistantCaption' },
};

export default withPermission(StaffAccessScreen, 'manage_staff');

function StaffAccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const member = useStaffStore((s) => s.members.find((m) => m.id === params.id) ?? null);
  const setMemberPermissions = useStaffStore((s) => s.setMemberPermissions);

  const [overrides, setOverrides] = useState<Record<string, boolean>>(member?.permissions ?? {});
  const [saving, setSaving] = useState(false);

  if (!member) {
    return (
      <Screen>
        <View className="flex-row items-center gap-1 pt-1">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('actions.back')}
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  const effective = (perm: Permission) => {
    const o = overrides[perm];
    return o !== undefined ? o : roleHasPermission(member.role, perm);
  };

  const toggle = (perm: Permission, value: boolean) =>
    setOverrides((prev) => {
      const next = { ...prev };
      // Keep the map minimal: only store a value when it differs from the role default.
      if (value === roleHasPermission(member.role, perm)) delete next[perm];
      else next[perm] = value;
      return next;
    });

  const save = async () => {
    setSaving(true);
    const err = await setMemberPermissions(member.id, overrides);
    setSaving(false);
    if (err) {
      toast.error(err);
      return;
    }
    haptics.success();
    toast.success(t('staff.accessSaved'), member.name);
    router.back();
  };

  return (
    <Screen scroll contentClassName="pb-10">
      <View className="flex-row items-center gap-1 pt-1">
        <IconButton
          icon={ArrowLeft}
          accessibilityLabel={t('actions.back')}
          onPress={() => router.back()}
        />
        <Text variant="title" weight="semibold">
          {t('staff.accessTitle')}
        </Text>
      </View>

      <View className="mt-4 flex-row items-center gap-3">
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
            contentFit="cover"
          />
        ) : (
          <Avatar name={member.name} size={48} />
        )}
        <View className="flex-1">
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {member.name}
          </Text>
          <Text variant="caption" tone="tertiary">
            {t(`roles.${member.role}`)}
          </Text>
        </View>
      </View>

      <Text variant="caption" tone="tertiary" className="mt-4 px-1">
        {t('staff.accessNote')}
      </Text>

      <Card className="mt-3 gap-4">
        {ASSIGNABLE_PERMISSIONS.map((perm) => {
          const meta = PERMISSION_META[perm];
          if (!meta) return null;
          return (
            <SwitchRow
              key={perm}
              label={t(meta.labelKey)}
              caption={t(meta.captionKey)}
              value={effective(perm)}
              onChange={(v) => toggle(perm, v)}
            />
          );
        })}
      </Card>

      {Object.keys(overrides).length > 0 ? (
        <PressableScale
          scaleTo={0.98}
          onPress={() => setOverrides({})}
          accessibilityRole="button"
          className="mt-4 self-center"
        >
          <Text variant="caption" weight="semibold" tone="accent">
            {t('staff.resetDefaults')}
          </Text>
        </PressableScale>
      ) : null}

      <Button
        label={t('common.save')}
        size="lg"
        fullWidth
        loading={saving}
        onPress={save}
        className="mt-8"
      />
    </Screen>
  );
}
