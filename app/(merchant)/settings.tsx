import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, Globe, Receipt, Store as StoreIcon, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Button,
  Card,
  IconButton,
  PressableScale,
  Screen,
  Sheet,
  SwitchRow,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import { CurrencySheet } from '@/features/onboarding/currency-sheet';
import { CURRENCIES } from '@/constants/currencies';
import { changeLanguage } from '@/i18n';
import { LANGUAGES, type LanguageCode } from '@/i18n/translations';
import { usePreferences } from '@/stores/preferences';
import { useStaffStore } from '@/stores/staff';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const store = useStoreProfile((s) => s.store);
  const updateStore = useStoreProfile((s) => s.updateStore);
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const staffCount = useStaffStore((s) => s.members.length);

  const currencySheet = useSheetRef();
  const languageSheet = useSheetRef();

  const [name, setName] = useState(store?.name ?? '');
  const [address, setAddress] = useState(store?.address ?? '');
  const [taxRate, setTaxRate] = useState(store ? String(store.taxRate * 100) : '0');
  const [currencyCode, setCurrencyCode] = useState(store?.currencyCode ?? 'USD');
  const [header, setHeader] = useState(store?.receipt.headerText ?? '');
  const [footer, setFooter] = useState(store?.receipt.footerText ?? '');
  const [showLogo, setShowLogo] = useState(store?.receipt.showLogo ?? true);

  const selectedCurrency = CURRENCIES.find((c) => c.code === currencyCode);
  const selectedLanguage = LANGUAGES.find((l) => l.code === language);

  const save = () => {
    const tax = Number.parseFloat(taxRate.replace(',', '.'));
    updateStore({
      name: name.trim() || store?.name || 'My store',
      address: address.trim() || null,
      taxRate: Number.isFinite(tax) ? Math.max(0, tax) / 100 : 0,
      currencyCode,
      receipt: {
        headerText: header.trim() || name.trim(),
        footerText: footer.trim(),
        showLogo,
      },
    });
    toast.success(t('settings.saved'));
    router.back();
  };

  const pickLanguage = (code: LanguageCode | null) => {
    setLanguage(code);
    if (code) changeLanguage(code);
    languageSheet.current?.dismiss();
  };

  return (
    <Screen padded={false} keyboardAvoid>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel={t('common.cancel')} onPress={() => router.back()} />
          <Text variant="h1" weight="bold">
            {t('settings.title')}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-32 pt-3" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Store profile */}
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          <SectionHeader icon={StoreIcon} label={t('settings.storeProfile')} />
          <View className="gap-4">
            <TextField label={t('settings.storeName')} value={name} onChangeText={setName} />
            <TextField label={t('settings.address')} value={address} onChangeText={setAddress} multiline />
            <View className="flex-row gap-3">
              <TextField
                label={t('settings.taxRate')}
                value={taxRate}
                onChangeText={(v) => setTaxRate(v.replace(',', '.'))}
                keyboardType="decimal-pad"
                containerClassName="flex-1"
              />
              <PressableScale
                scaleTo={0.98}
                onPress={() => currencySheet.current?.present()}
                accessibilityRole="button"
                accessibilityLabel={`${t('settings.currency')}: ${currencyCode}`}
                className="h-14 flex-1 flex-row items-center justify-between rounded-md border border-hairline bg-surface px-4 dark:bg-surface-elevated"
              >
                <View>
                  <Text variant="micro" weight="medium" tone="tertiary">
                    {t('settings.currency').toUpperCase()}
                  </Text>
                  <Text variant="body" weight="medium">
                    {selectedCurrency?.symbol} {currencyCode}
                  </Text>
                </View>
                <ChevronDown size={18} color={colors.inkTertiary} strokeWidth={2} />
              </PressableScale>
            </View>
          </View>
        </Animated.View>

        {/* Receipt */}
        <Animated.View entering={FadeInDown.delay(40).springify().damping(18)}>
          <SectionHeader icon={Receipt} label={t('settings.receipt')} />
          <View className="gap-4">
            <TextField label={t('settings.receiptHeader')} value={header} onChangeText={setHeader} />
            <TextField label={t('settings.receiptFooter')} value={footer} onChangeText={setFooter} />
            <Card>
              <SwitchRow label={t('settings.showLogo')} value={showLogo} onChange={setShowLogo} />
            </Card>
          </View>
        </Animated.View>

        {/* Language + Staff */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)}>
          <SectionHeader icon={Globe} label={t('settings.language')} />
          <Card padded={false}>
            <PressableScale
              scaleTo={0.99}
              onPress={() => languageSheet.current?.present()}
              accessibilityRole="button"
              className="flex-row items-center justify-between px-4 py-3.5"
            >
              <Text variant="body" weight="medium">
                {selectedLanguage?.label ?? t('language.system')}
              </Text>
              <ChevronDown size={18} color={colors.inkTertiary} strokeWidth={2} />
            </PressableScale>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)}>
          <SectionHeader icon={Users} label={t('settings.staff')} />
          <Card
            padded={false}
            className="flex-row items-center justify-between px-4 py-3.5"
            onPress={() => router.push('/staff')}
          >
            <Text variant="body" weight="medium">
              {staffCount > 0 ? `${staffCount} team member${staffCount === 1 ? '' : 's'}` : 'Add your team'}
            </Text>
            <ChevronDown size={18} color={colors.inkTertiary} strokeWidth={2} style={{ transform: [{ rotate: '-90deg' }] }} />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} className="mt-8 items-center">
          <Text variant="caption" weight="medium" tone="tertiary">
            {t('settings.about')}
          </Text>
          <Text variant="micro" tone="tertiary" className="mt-1">
            Counter · A Retail Operating System · v0.1.0
          </Text>
        </Animated.View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-hairline bg-surface px-5 pb-9 pt-4 dark:bg-surface-elevated">
        <Button label={t('common.save')} size="lg" fullWidth onPress={save} />
      </View>

      <CurrencySheet ref={currencySheet} selected={currencyCode} onSelect={setCurrencyCode} />

      <Sheet ref={languageSheet} title={t('settings.language')}>
        <View className="gap-1">
          <PressableScale
            scaleTo={0.98}
            haptic="selection"
            onPress={() => pickLanguage(null)}
            accessibilityRole="button"
            className={`flex-row items-center justify-between rounded-md px-3 py-3.5 ${language === null ? 'bg-primary-tint' : ''}`}
          >
            <Text variant="body" weight={language === null ? 'semibold' : 'regular'} tone={language === null ? 'accent' : 'primary'}>
              {t('language.system')}
            </Text>
          </PressableScale>
          {LANGUAGES.map((option) => (
            <PressableScale
              key={option.code}
              scaleTo={0.98}
              haptic="selection"
              onPress={() => pickLanguage(option.code)}
              accessibilityRole="button"
              className={`flex-row items-center justify-between rounded-md px-3 py-3.5 ${language === option.code ? 'bg-primary-tint' : ''}`}
            >
              <Text variant="body" weight={language === option.code ? 'semibold' : 'regular'} tone={language === option.code ? 'accent' : 'primary'}>
                {option.label}
              </Text>
              {option.rtl ? (
                <Text variant="micro" tone="tertiary">
                  RTL
                </Text>
              ) : null}
            </PressableScale>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: typeof StoreIcon; label: string }) {
  const { colors } = useTheme();
  return (
    <View className="mb-3 mt-7 flex-row items-center gap-2">
      <Icon size={16} color={colors.inkSecondary} strokeWidth={2} />
      <Text variant="h2" weight="semibold">
        {label}
      </Text>
    </View>
  );
}
