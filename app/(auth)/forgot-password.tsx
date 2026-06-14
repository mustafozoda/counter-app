import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, IconButton, Screen, Text, TextField } from '@/components/ui';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { toast } from '@/stores/toast';
import { STAGGER_MS, useTheme } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    // Mock reset; the Supabase adapter will send a real email later.
    await new Promise((r) => setTimeout(r, 600));
    toast.success(t('auth.resetSent'), t('auth.resetSentBody', { email: values.email }));
    router.back();
  });

  return (
    <Screen scroll keyboardAvoid contentClassName="flex-grow pb-10">
      <View className="mt-2 flex-row items-center">
        <IconButton icon={ArrowLeft} accessibilityLabel={t('auth.goBack')} onPress={() => router.back()} />
      </View>

      <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-6">
        <View className="h-16 w-16 items-center justify-center rounded-lg bg-primary-tint">
          <KeyRound size={28} color={colors.primary} strokeWidth={1.75} />
        </View>
        <Text variant="display" weight="bold" className="mt-6">
          {t('auth.resetTitle')}
        </Text>
        <Text variant="body" tone="secondary" className="mt-3">
          {t('auth.resetSubtitle')}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS * 2).springify().damping(18)}
        className="mt-10 gap-4"
      >
        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur }, fieldState }) => (
            <TextField
              label={t('auth.email')}
              icon={Mail}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />
        <Button label={t('auth.sendReset')} size="lg" fullWidth loading={isSubmitting} onPress={onSubmit} />
      </Animated.View>
    </Screen>
  );
}
