import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useRef } from 'react';
import { Alert, View } from 'react-native';

import { BarcodeScannerView, IconButton, Screen, Text } from '@/components/ui';
import { productsApi } from '@/api/products';
import { variantLabel } from '@/features/products/stock';
import { haptics } from '@/lib/haptics';
import { useScannerStore } from '@/stores/scanner';
import { toast } from '@/stores/toast';

export default function ScanScreen() {
  const router = useRouter();
  const request = useScannerStore((s) => s.request);
  const resetRequest = useScannerStore((s) => s.reset);
  const busy = useRef(false);

  const close = () => {
    resetRequest();
    router.back();
  };

  const handleScan = async (code: string) => {
    if (busy.current) return;

    if (request.mode === 'capture') {
      request.onCapture(code);
      close();
      return;
    }

    busy.current = true;
    const hit = await productsApi.findByBarcode(code);
    if (hit) {
      toast.success(hit.product.name, variantLabel(hit.variant));
      resetRequest();
      router.replace({ pathname: '/product/[id]', params: { id: hit.product.id } });
      return;
    }

    haptics.warning();
    Alert.alert('No match', `Nothing in your catalog has barcode ${code}.`, [
      { text: 'Keep scanning', style: 'cancel', onPress: () => (busy.current = false) },
      {
        text: 'Create product',
        onPress: () => {
          resetRequest();
          router.replace({ pathname: '/product-form', params: { barcode: code } });
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View className="flex-row items-center justify-between pt-2">
        <Text variant="h1" weight="bold">
          {request.mode === 'capture' ? 'Scan barcode' : 'Find by barcode'}
        </Text>
        <IconButton icon={X} accessibilityLabel="Close scanner" onPress={close} />
      </View>
      <View className="flex-1 py-4">
        <BarcodeScannerView
          onScanned={(code) => void handleScan(code)}
          hint={
            request.mode === 'capture'
              ? 'Scan the label to fill the barcode field'
              : 'Scan any product label to look it up'
          }
        />
      </View>
    </Screen>
  );
}
