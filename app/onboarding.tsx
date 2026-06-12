import { ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { Button, IconButton, ProgressBar, Screen, Text } from '@/components/ui';
import {
  CurrencyStep,
  LogoStep,
  NameStep,
  ProductStep,
  VerticalStep,
  initialDraft,
  type SetupDraft,
} from '@/features/onboarding/steps';
import { SuccessCheck } from '@/features/onboarding/success-check';
import { haptics } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth';
import { useStoreProfile } from '@/stores/store-profile';
import { STAGGER_MS } from '@/theme';

type StepKey = 'name' | 'vertical' | 'currency' | 'logo' | 'product';

interface StepMeta {
  key: StepKey;
  title: string;
  subtitle: string;
  skippable: boolean;
}

const STEPS: StepMeta[] = [
  {
    key: 'name',
    title: 'Name your store',
    subtitle: 'This appears on your receipts, storefront and reports.',
    skippable: false,
  },
  {
    key: 'vertical',
    title: 'What do you sell?',
    subtitle: 'We tailor categories, sizes and attributes to fit.',
    skippable: false,
  },
  {
    key: 'currency',
    title: 'Your currency',
    subtitle: 'The money language of your whole business.',
    skippable: false,
  },
  {
    key: 'logo',
    title: 'Add your logo',
    subtitle: 'Give your storefront and receipts a face.',
    skippable: true,
  },
  {
    key: 'product',
    title: 'Your first product',
    subtitle: 'Add one thing you sell — feel the flow of stocking.',
    skippable: true,
  },
];

function isStepValid(step: StepKey, draft: SetupDraft): boolean {
  switch (step) {
    case 'name':
      return draft.name.trim().length >= 2;
    case 'vertical':
      return draft.vertical !== null;
    case 'currency':
      return draft.currencyCode.length === 3;
    case 'logo':
      return true;
    case 'product': {
      if (draft.productName.trim() === '' && draft.productPrice.trim() === '') return true;
      const price = Number.parseFloat(draft.productPrice);
      return draft.productName.trim().length >= 2 && Number.isFinite(price) && price > 0;
    }
  }
}

function DoneScreen({ storeName, onEnter }: { storeName: string; onEnter: () => void }) {
  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <Screen contentClassName="items-center justify-center">
      <SuccessCheck size={132} />
      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS * 4).springify().damping(18)}
        className="mt-10 items-center"
      >
        <Text variant="display" weight="bold" className="text-center">
          {storeName} is ready
        </Text>
        <Text variant="body" tone="secondary" className="mt-3 text-center">
          Your counter is open. Stock it, sell it, watch it grow.
        </Text>
      </Animated.View>
      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS * 7).springify().damping(18)}
        className="mt-12 w-full"
      >
        <Button label="Open my store" size="lg" fullWidth onPress={onEnter} />
      </Animated.View>
    </Screen>
  );
}

export default function OnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<SetupDraft>(initialDraft);
  const [done, setDone] = useState(false);

  const completeSetup = useStoreProfile((s) => s.completeSetup);
  const signOut = useAuthStore((s) => s.signOut);

  const step = STEPS[stepIndex] ?? STEPS[0]!;
  const valid = isStepValid(step.key, draft);
  const isLast = stepIndex === STEPS.length - 1;

  const patch = (partial: Partial<SetupDraft>) => setDraft((d) => ({ ...d, ...partial }));

  const goNext = () => {
    if (isLast) {
      setDone(true);
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const skip = () => {
    if (step.key === 'logo') patch({ logoUri: null });
    if (step.key === 'product') patch({ productName: '', productPrice: '' });
    goNext();
  };

  const enterStore = () => {
    const price = Number.parseFloat(draft.productPrice);
    const firstProduct =
      draft.productName.trim().length >= 2 && Number.isFinite(price) && price > 0
        ? { name: draft.productName.trim(), price }
        : null;
    completeSetup(
      {
        name: draft.name.trim(),
        vertical: draft.vertical ?? 'other',
        currencyCode: draft.currencyCode,
        logoUri: draft.logoUri,
      },
      firstProduct,
    );
  };

  if (done) {
    return <DoneScreen storeName={draft.name.trim()} onEnter={enterStore} />;
  }

  return (
    <Screen keyboardAvoid>
      <View className="mt-2 flex-row items-center gap-4">
        {stepIndex > 0 ? (
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel="Previous step"
            onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
          />
        ) : (
          <View className="h-11 w-11" />
        )}
        <View className="flex-1">
          <ProgressBar progress={(stepIndex + 1) / STEPS.length} />
        </View>
        <Text variant="caption" weight="medium" tone="tertiary" tabular>
          {stepIndex + 1} / {STEPS.length}
        </Text>
      </View>

      <Animated.View key={step.key} entering={FadeInRight.springify().damping(20)} className="mt-10 flex-1">
        <Text variant="display" weight="bold">
          {step.title}
        </Text>
        <Text variant="body" tone="secondary" className="mt-3">
          {step.subtitle}
        </Text>
        <View className="mt-8 flex-1">
          {step.key === 'name' && <NameStep draft={draft} patch={patch} />}
          {step.key === 'vertical' && <VerticalStep draft={draft} patch={patch} />}
          {step.key === 'currency' && <CurrencyStep draft={draft} patch={patch} />}
          {step.key === 'logo' && <LogoStep draft={draft} patch={patch} />}
          {step.key === 'product' && <ProductStep draft={draft} patch={patch} />}
        </View>
      </Animated.View>

      <View className="gap-3 pb-6">
        <Button
          label={isLast ? 'Finish setup' : 'Continue'}
          size="lg"
          fullWidth
          disabled={!valid}
          onPress={goNext}
        />
        {step.skippable ? (
          <Button label="Skip for now" variant="ghost" fullWidth onPress={skip} />
        ) : null}
        {stepIndex === 0 ? (
          <Button label="Sign out" variant="ghost" fullWidth onPress={signOut} />
        ) : null}
      </View>
    </Screen>
  );
}
