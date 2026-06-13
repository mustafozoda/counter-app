import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, Lock, Mail, UserRound } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
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
    } catch {
      toast.error('Could not create account', 'Please try again.');
    }
  });

  return (
    <Screen scroll keyboardAvoid contentClassName="flex-grow pb-10">
      <View className="mt-2 flex-row items-center">
        <IconButton
          icon={ArrowLeft}
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        />
      </View>

      <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-6">
        <Text variant="display" weight="bold">
          Create your{'\n'}account
        </Text>
        <Text variant="body" tone="secondary" className="mt-3">
          Your store will be set up in under a minute.
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
              label="Your name"
              icon={UserRound}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message}
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
              label="Email"
              icon={Mail}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message}
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
              label="Password"
              icon={Lock}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={fieldState.error?.message}
              helper="At least 8 characters"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        <Button
          label="Create account"
          size="lg"
          fullWidth
          loading={isSubmitting}
          onPress={onSubmit}
          className="mt-2"
        />
      </Animated.View>

      <View className="mt-auto flex-row items-center justify-center gap-1 pt-8">
        <Text variant="body" tone="secondary">
          Already have an account?
        </Text>
        <Link href="/sign-in" asChild>
          <Text variant="body" weight="semibold" tone="accent">
            Sign in
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
