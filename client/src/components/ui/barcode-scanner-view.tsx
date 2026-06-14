import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Flashlight, ScanLine, Keyboard as KeyboardIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { Button } from './button';
import { EmptyState } from './empty-state';
import { IconButton } from './icon-button';
import { Text } from './text';
import { TextField } from './text-field';

export interface BarcodeScannerViewProps {
  onScanned: (code: string) => void;
  /** Re-arm delay between reads of the same/new codes. */
  cooldownMs?: number;
  hint?: string;
}

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] as const;

/**
 * Full-bleed barcode scanner: camera + dimmed viewfinder, torch toggle and a
 * manual-entry fallback (simulators, damaged labels, denied permission).
 */
export function BarcodeScannerView({ onScanned, cooldownMs = 1600, hint }: BarcodeScannerViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const lastScanAt = useRef(0);

  const handleScan = (result: BarcodeScanningResult) => {
    const now = Date.now();
    if (now - lastScanAt.current < cooldownMs) return;
    lastScanAt.current = now;
    haptics.success();
    onScanned(result.data);
  };

  const submitManual = () => {
    const code = manualCode.trim();
    if (code.length === 0) return;
    haptics.success();
    onScanned(code);
    setManualCode('');
  };

  if (!permission) return <View className="flex-1 bg-background" />;

  if (!permission.granted || manual) {
    return (
      <View className="flex-1 justify-center px-5">
        {permission.granted ? (
          <View className="gap-4">
            <Text variant="h2" weight="semibold">
              {t('scan.enterBarcode')}
            </Text>
            <TextField
              label={t('scan.barcodeOrSku')}
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="default"
              autoCapitalize="characters"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submitManual}
            />
            <Button label={t('scan.find')} size="lg" fullWidth onPress={submitManual} disabled={manualCode.trim() === ''} />
            <Button label={t('scan.backToCamera')} variant="ghost" fullWidth onPress={() => setManual(false)} />
          </View>
        ) : (
          <EmptyState
            icon={ScanLine}
            title={t('scan.cameraNeeded')}
            message={t('scan.cameraNeededMsg')}
            actionLabel={permission.canAskAgain ? t('scan.allowCamera') : t('scan.typeInstead')}
            onAction={() => {
              if (permission.canAskAgain) void requestPermission();
              else setManual(true);
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 overflow-hidden rounded-xl">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={handleScan}
      />
      <View className="flex-1 items-center justify-center" pointerEvents="box-none">
        <Animated.View
          entering={FadeIn.duration(300)}
          className="h-44 w-72 rounded-lg border-2"
          style={{ borderColor: colors.primary }}
        />
        <Text variant="caption" tone="inverse" className="mt-4 text-center opacity-90">
          {hint ?? t('scan.frameHint')}
        </Text>
      </View>
      <View className="absolute bottom-6 left-0 right-0 flex-row items-center justify-center gap-4">
        <IconButton
          icon={Flashlight}
          accessibilityLabel={torch ? t('scan.torchOff') : t('scan.torchOn')}
          variant={torch ? 'tonal' : 'surface'}
          onPress={() => setTorch((prev) => !prev)}
        />
        <IconButton
          icon={KeyboardIcon}
          accessibilityLabel={t('scan.typeManually')}
          variant="surface"
          onPress={() => setManual(true)}
        />
      </View>
    </View>
  );
}
