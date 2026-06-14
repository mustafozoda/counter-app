import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronDown, ImagePlus, Store, Tag } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Button,
  Chip,
  Logo,
  PressableScale,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import { CURRENCIES } from '@/constants/currencies';
import { STORE_VERTICALS } from '@/constants/store-verticals';
import { getCurrencySpec } from '@/lib/format';
import { useTheme } from '@/theme';

import { CurrencySheet } from './currency-sheet';

export interface SetupDraft {
  name: string;
  vertical: string | null;
  currencyCode: string;
  logoUri: string | null;
  productName: string;
  productPrice: string;
}

export const initialDraft: SetupDraft = {
  name: '',
  vertical: null,
  currencyCode: 'TJS',
  logoUri: null,
  productName: '',
  productPrice: '',
};

interface StepProps {
  draft: SetupDraft;
  patch: (partial: Partial<SetupDraft>) => void;
}

export function NameStep({ draft, patch }: StepProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-4">
      <TextField
        label={t('settings.storeName')}
        icon={Store}
        value={draft.name}
        onChangeText={(name) => patch({ name })}
        autoFocus
        returnKeyType="done"
        helper={t('onboarding.storeNameHelper')}
      />
    </View>
  );
}

export function VerticalStep({ draft, patch }: StepProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {STORE_VERTICALS.map((vertical) => (
        <Chip
          key={vertical.id}
          label={t(vertical.labelKey)}
          icon={vertical.icon}
          selected={draft.vertical === vertical.id}
          onPress={() => patch({ vertical: vertical.id })}
        />
      ))}
    </View>
  );
}

export function CurrencyStep({ draft, patch }: StepProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sheetRef = useSheetRef();
  const selected = CURRENCIES.find((c) => c.code === draft.currencyCode);

  return (
    <View className="gap-4">
      <PressableScale
        scaleTo={0.98}
        onPress={() => sheetRef.current?.present()}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.currencyA11y', { name: selected?.name ?? draft.currencyCode })}
        className="h-16 flex-row items-center gap-3 rounded-md border border-hairline bg-surface px-4 dark:bg-surface-elevated"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-tint">
          <Text variant="body" weight="semibold" tone="accent">
            {selected?.symbol ?? '$'}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="body" weight="semibold">
            {selected?.name ?? draft.currencyCode}
          </Text>
          <Text variant="caption" tone="tertiary" mono>
            {draft.currencyCode}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.inkTertiary} strokeWidth={2} />
      </PressableScale>
      <Text variant="caption" tone="tertiary" className="px-1">
        {t('onboarding.currencyNote')}
      </Text>

      <CurrencySheet
        ref={sheetRef}
        selected={draft.currencyCode}
        onSelect={(currencyCode) => patch({ currencyCode })}
      />
    </View>
  );
}

export function LogoStep({ draft, patch }: StepProps) {
  const { t } = useTranslation();
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) patch({ logoUri: uri });
  };

  return (
    <View className="items-center gap-6 pt-2">
      {draft.logoUri ? (
        <Image
          source={{ uri: draft.logoUri }}
          style={{ width: 128, height: 128, borderRadius: 38 }}
          contentFit="cover"
          transition={200}
          accessibilityLabel={t('onboarding.logoPreview')}
        />
      ) : (
        <Logo size={128} letter={(draft.name.trim()[0] ?? 'C').toUpperCase()} />
      )}
      <Button
        label={draft.logoUri ? t('onboarding.choosePhotoChange') : t('onboarding.choosePhoto')}
        variant="secondary"
        icon={ImagePlus}
        onPress={pickImage}
      />
      <Text variant="caption" tone="tertiary" className="text-center">
        {t('onboarding.logoNote')}
      </Text>
    </View>
  );
}

export function ProductStep({ draft, patch }: StepProps) {
  const { t } = useTranslation();
  const spec = getCurrencySpec(draft.currencyCode);

  return (
    <View className="gap-4">
      <TextField
        label={t('product.productName')}
        icon={Tag}
        value={draft.productName}
        onChangeText={(productName) => patch({ productName })}
        returnKeyType="next"
      />
      <TextField
        label={t('product.sellingPrice')}
        prefix={spec.symbol}
        value={draft.productPrice}
        onChangeText={(productPrice) => patch({ productPrice: productPrice.replace(',', '.') })}
        keyboardType="decimal-pad"
        returnKeyType="done"
        helper={t('onboarding.productHelper')}
      />
    </View>
  );
}
