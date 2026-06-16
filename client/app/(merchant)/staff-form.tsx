import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Check,
  Copy,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  StickyNote,
  User as UserIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Avatar,
  Button,
  IconButton,
  PressableScale,
  Screen,
  SwitchRow,
  Text,
  TextField,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { haptics } from '@/lib/haptics';
import { uploadImage } from '@/lib/upload';
import { useAuthStore } from '@/stores/auth';
import { ROLE_PERMISSIONS, useStaffStore, type Permission } from '@/stores/staff';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import type { StaffRole } from '@/types/models';

const ROLE_OPTIONS: StaffRole[] = ['cashier', 'manager', 'owner'];

const PERMISSION_LABEL_KEY: Record<Permission, string> = {
  sell: 'staff.permSell',
  manage_inventory: 'staff.permInventory',
  view_finance: 'staff.permFinance',
  manage_staff: 'staff.permStaff',
  manage_settings: 'staff.permSettings',
};

// A readable strong password (no look-alike chars). The owner copies it once at
// set-time — there's no way to read a password back later (it's hashed).
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default withPermission(StaffFormScreen, 'manage_staff');

function StaffFormScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();

  const members = useStaffStore((s) => s.members);
  const createStaff = useStaffStore((s) => s.createStaff);
  const updateStaff = useStaffStore((s) => s.updateStaff);
  const setStaffPassword = useStaffStore((s) => s.setStaffPassword);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const storeId = useStoreProfile((s) => s.store?.id ?? null);

  const editing = useMemo(() => members.find((m) => m.id === params.id) ?? null, [members, params.id]);
  const isEdit = editing !== null;
  const isSelf = editing?.userId != null && editing.userId === currentUserId;

  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [role, setRole] = useState<StaffRole>(editing?.role ?? 'cashier');
  const [active, setActive] = useState(editing?.active ?? true);
  const [avatar, setAvatar] = useState<string | null>(editing?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const copyPassword = () => {
    void Clipboard.setStringAsync(password);
    haptics.selection();
    toast.success(t('staff.passwordCopied'));
  };

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const next: { name?: string; email?: string; password?: string } = {};
    if (trimmedName.length < 2) next.name = t('staff.nameNeededBody');
    if (trimmedEmail.length === 0) next.email = t('staff.emailNeeded');
    if (!isEdit && password.length === 0) next.password = t('staff.passwordNeeded');
    else if (password.length > 0 && password.length < 6) next.password = t('staff.passwordTooShort');
    setErrors(next);
    if (next.name || next.email || next.password) return;

    setSaving(true);
    try {
      let avatarUrl = avatar;
      if (avatar && storeId && !/^https?:\/\//i.test(avatar)) {
        avatarUrl = await uploadImage(avatar, storeId);
      }

      let err: string | null;
      if (isEdit && editing) {
        err = await updateStaff(editing.id, {
          name: trimmedName,
          email: trimmedEmail,
          phone: phone.trim() || null,
          title: title.trim() || null,
          note: note.trim() || null,
          avatarUrl: avatarUrl ?? null,
          // You can't change your own role or suspend yourself.
          ...(isSelf ? {} : { role, active }),
        });
        if (!err && password.length > 0) err = await setStaffPassword(editing.id, password);
      } else {
        err = await createStaff({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role,
          phone: phone.trim() || null,
          title: title.trim() || null,
          note: note.trim() || null,
          avatarUrl: avatarUrl ?? null,
        });
      }

      if (err) {
        toast.error(err);
        return;
      }
      haptics.success();
      toast.success(isEdit ? t('staff.staffUpdated') : t('staff.staffCreated'), trimmedName);
      router.back();
    } catch {
      toast.error(t('staff.actionFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid contentClassName="pb-10">
      <View className="flex-row items-center gap-1 pt-1">
        <IconButton
          icon={ArrowLeft}
          accessibilityLabel={t('actions.back')}
          onPress={() => router.back()}
        />
        <Text variant="title" weight="semibold">
          {isEdit ? t('staff.editStaff') : t('staff.addStaff')}
        </Text>
      </View>

      {!isEdit ? (
        <View className="mt-4 rounded-md bg-primary-tint px-4 py-3">
          <Text variant="caption" tone="accent">
            {t('staff.ownerHint')}
          </Text>
        </View>
      ) : null}

      <View className="mt-6 items-center">
        <PressableScale
          scaleTo={0.96}
          haptic="tap"
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={t('staff.photo')}
        >
          <View>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={{ width: 88, height: 88, borderRadius: 44 }}
                contentFit="cover"
              />
            ) : (
              <Avatar name={name || '?'} size={88} />
            )}
            <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary">
              <Camera size={13} color={colors.onPrimary} strokeWidth={2} />
            </View>
          </View>
        </PressableScale>
      </View>

      <View className="mt-7 gap-4">
        <TextField
          label={t('staff.name')}
          icon={UserIcon}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
        />
        <TextField
          label={t('staff.email')}
          icon={Mail}
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextField
          label={isEdit ? t('staff.newPasswordOptional') : t('staff.password')}
          icon={Lock}
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          helper={t('staff.passwordHint')}
        />
        <View className="-mt-2 flex-row gap-2 px-1">
          <PressableScale
            scaleTo={0.96}
            haptic="tap"
            onPress={() => setPassword(generatePassword())}
            accessibilityRole="button"
            className="flex-row items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1.5 dark:bg-surface-elevated"
          >
            <RefreshCw size={13} color={colors.inkSecondary} strokeWidth={2.2} />
            <Text variant="caption" weight="medium" tone="secondary">
              {t('staff.generate')}
            </Text>
          </PressableScale>
          {password.length > 0 ? (
            <PressableScale
              scaleTo={0.96}
              haptic="tap"
              onPress={copyPassword}
              accessibilityRole="button"
              className="flex-row items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1.5 dark:bg-surface-elevated"
            >
              <Copy size={13} color={colors.inkSecondary} strokeWidth={2.2} />
              <Text variant="caption" weight="medium" tone="secondary">
                {t('staff.copyPassword')}
              </Text>
            </PressableScale>
          ) : null}
        </View>
        <TextField
          label={t('staff.phone')}
          icon={Phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextField
          label={t('staff.position')}
          icon={Briefcase}
          value={title}
          onChangeText={setTitle}
        />
        <TextField
          label={t('staff.note')}
          icon={StickyNote}
          value={note}
          onChangeText={setNote}
          multiline
        />
      </View>

      {!isSelf ? (
        <>
          <Text variant="caption" weight="medium" tone="tertiary" className="mt-7 px-1">
            {t('staff.role')}
          </Text>
          <View className="mt-2 gap-2">
            {ROLE_OPTIONS.map((option) => {
              const selected = role === option;
              return (
                <PressableScale
                  key={option}
                  scaleTo={0.98}
                  haptic="selection"
                  onPress={() => setRole(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`gap-2 rounded-md border p-4 ${
                    selected
                      ? 'border-primary bg-primary-tint'
                      : 'border-hairline bg-surface dark:bg-surface-elevated'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text variant="body" weight="semibold" tone={selected ? 'accent' : 'primary'}>
                      {t(`roles.${option}`)}
                    </Text>
                    {selected ? <Check size={18} color={colors.primary} strokeWidth={2.5} /> : null}
                  </View>
                  <View className="flex-row flex-wrap gap-1.5">
                    {ROLE_PERMISSIONS[option].map((permission) => (
                      <View
                        key={permission}
                        className="rounded-full bg-surface-sunken px-2 py-0.5 dark:bg-surface"
                      >
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

          {isEdit ? (
            <View className="mt-6 rounded-md border border-hairline bg-surface px-4 py-3.5 dark:bg-surface-elevated">
              <SwitchRow
                label={t('staff.active')}
                caption={t('staff.activeCaption')}
                value={active}
                onChange={setActive}
              />
            </View>
          ) : null}
        </>
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
