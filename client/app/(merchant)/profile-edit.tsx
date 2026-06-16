import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Lock, User as UserIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Button, IconButton, PressableScale, Screen, Text, TextField } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { uploadImage } from '@/lib/upload';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);

  const [name, setName] = useState(user?.name ?? '');
  // Local file URI (newly picked) or remote URL (existing avatar).
  const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl ?? null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({});

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const save = async () => {
    const trimmed = name.trim();
    const next: { name?: string; password?: string } = {};
    if (trimmed.length === 0) next.name = t('profile.nameRequired');
    if (password.length > 0 && password.length < 6) next.password = t('profile.passwordTooShort');
    else if (password.length > 0 && password !== confirm)
      next.password = t('profile.passwordMismatch');
    setErrors(next);
    if (next.name || next.password) return;

    setSaving(true);
    try {
      let avatarUrl = avatar;
      // Upload only a freshly-picked local file; remote URLs pass through.
      if (avatar && user && !/^https?:\/\//i.test(avatar)) {
        avatarUrl = await uploadImage(avatar, user.id);
      }
      await updateProfile({ name: trimmed, avatarUrl: avatarUrl ?? null });
      if (password.length > 0) await changePassword(password);
      haptics.success();
      toast.success(t('profile.updated'));
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(t('profile.updateFailed'), message || undefined);
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
          {t('profile.edit')}
        </Text>
      </View>

      <View className="mt-6 items-center">
        <PressableScale
          scaleTo={0.96}
          haptic="tap"
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePhoto')}
        >
          <View>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
                contentFit="cover"
              />
            ) : (
              <Avatar name={name || 'C'} size={96} />
            )}
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary">
              <Camera size={15} color={colors.onPrimary} strokeWidth={2} />
            </View>
          </View>
        </PressableScale>
        <Text variant="caption" tone="tertiary" className="mt-2">
          {t('profile.changePhoto')}
        </Text>
      </View>

      <View className="mt-7">
        <TextField
          label={t('profile.name')}
          icon={UserIcon}
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <Text variant="caption" weight="medium" tone="tertiary" className="mt-7 px-1">
        {t('profile.password')}
      </Text>
      <View className="mt-2 gap-4">
        <TextField
          label={t('profile.newPassword')}
          icon={Lock}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          helper={t('profile.passwordHint')}
        />
        <TextField
          label={t('profile.confirmPassword')}
          icon={Lock}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          error={errors.password}
        />
      </View>

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
