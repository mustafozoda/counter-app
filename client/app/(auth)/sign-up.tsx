import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, Lock, Mail, UserRound } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, IconButton, Screen, Text, TextField } from '@/components/ui';
import { signUpSchema, type SignUpValues } from '@/features/auth/schemas';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { STAGGER_MS } from '@/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const signUp = useAuthStore((s) => s.signUp);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signUp(values.name, values.email, values.password);
      haptics.success();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(t('auth.createFailed'), message || t('auth.tryAgain'));
    }
  });

  return (
    <Screen scroll keyboardAvoid contentClassName="flex-grow pb-10">
      <View className="mt-2 flex-row items-center">
        <IconButton
          icon={ArrowLeft}
          accessibilityLabel={t('auth.goBack')}
          onPress={() => router.back()}
        />
      </View>

      <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-6">
        <Text variant="display" weight="bold">
          {t('auth.createTitle')}
        </Text>
        <Text variant="body" tone="secondary" className="mt-3">
          {t('auth.createSubtitle')}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS * 2).springify().damping(18)}
        className="mt-10 gap-4"
      >
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur }, fieldState }) => (
            <TextField
              label={t('auth.yourName')}
              icon={UserRound}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
              autoComplete="name"
              returnKeyType="next"
            />
          )}
        />
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
              returnKeyType="next"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur }, fieldState }) => (
            <TextField
              label={t('auth.password')}
              icon={Lock}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
              helper={t('auth.min8')}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        <Button
          label={t('auth.createAccount')}
          size="lg"
          fullWidth
          loading={isSubmitting}
          onPress={onSubmit}
          className="mt-2"
        />
      </Animated.View>

      <View className="mt-auto flex-row items-center justify-center gap-1 pt-8">
        <Text variant="body" tone="secondary">
          {t('auth.haveAccount')}
        </Text>
        <Link href="/sign-in" asChild>
          <Text variant="body" weight="semibold" tone="accent">
            {t('auth.signIn')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
