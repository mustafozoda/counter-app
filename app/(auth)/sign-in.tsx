import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Logo, Screen, Text, TextField } from '@/components/ui';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { STAGGER_MS } from '@/theme';

export default function SignInScreen() {
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values.email, values.password);
      haptics.success();
    } catch {
      toast.error(t('auth.signInFailed'), t('auth.signInFailedBody'));
    }
  });

  return (
    <Screen scroll keyboardAvoid contentClassName="flex-grow justify-center pb-10">
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        className="items-center"
      >
        <Logo size={76} />
        <Text variant="display" weight="bold" className="mt-7">
          Counter
        </Text>
        <Text variant="body" tone="secondary" className="mt-2 text-center">
          {t('auth.tagline')}
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS * 2).springify().damping(18)}
        className="mt-12 gap-4"
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
              secureTextEntry
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        <Link href="/forgot-password" asChild>
          <Text variant="caption" weight="semibold" tone="accent" className="self-end px-1">
            {t('auth.forgotPassword')}
          </Text>
        </Link>

        <Button
          label={t('auth.signIn')}
          size="lg"
          fullWidth
          loading={isSubmitting}
          onPress={onSubmit}
          className="mt-2"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS * 4).springify().damping(18)}
        className="mt-10 flex-row items-center justify-center gap-1"
      >
        <Text variant="body" tone="secondary">
          {t('auth.newToCounter')}
        </Text>
        <Link href="/sign-up" asChild>
          <Text variant="body" weight="semibold" tone="accent">
            {t('auth.createAccount')}
          </Text>
        </Link>
      </Animated.View>
    </Screen>
  );
}
