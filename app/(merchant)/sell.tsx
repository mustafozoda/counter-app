import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ArrowLeft, PackageOpen, ReceiptText, ScanBarcode, Share2, ShoppingBag, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import type { OrderWithPayments } from '@/api/orders';
import { productsApi } from '@/api/products';
import {
  Button,
  Chip,
  CurrencyText,
  EmptyState,
  IconButton,
  PressableScale,
  Screen,
  SearchBar,
  Skeleton,
  SuccessCheck,
  Text,
  useSheetRef,
} from '@/components/ui';
import { CartSheet } from '@/features/pos/components/cart-sheet';
import { CheckoutView } from '@/features/pos/components/checkout-view';
import { DiscountSheet } from '@/features/pos/components/discount-sheet';
import { ProductTile } from '@/features/pos/components/product-tile';
import { VariantPickerSheet } from '@/features/pos/components/variant-picker-sheet';
import { useCreateSale } from '@/features/pos/hooks';
import { makeCartLine } from '@/features/pos/lines';
import { shareReceiptPdf } from '@/features/pos/share-receipt';
import { computeTotals, type PaymentEntry } from '@/features/pos/totals';
import { useCategories, useProducts } from '@/features/products/hooks';
import { productStockStatus, type ProductWithVariants } from '@/features/products/stock';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useCartStore } from '@/stores/cart';
import { useScannerStore } from '@/stores/scanner';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { STAGGER_MS } from '@/theme';
import type { ProductVariant } from '@/types/models';

type Mode = 'browse' | 'checkout';

const GRID_GUTTER = 20;
const GRID_GAP = 12;

export default function SellScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const store = useStoreProfile((s) => s.store);
  const currency = store?.currencyCode ?? 'USD';
  const taxRate = store?.taxRate ?? 0;

  const productsQuery = useProducts();
  const categories = useCategories().data ?? [];
  const createSale = useCreateSale();
  const setScanRequest = useScannerStore((s) => s.setRequest);

  const lines = useCartStore((s) => s.lines);
  const discount = useCartStore((s) => s.discount);
  const addLine = useCartStore((s) => s.addLine);
  const clearCart = useCartStore((s) => s.clear);

  const [mode, setMode] = useState<Mode>('browse');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [picking, setPicking] = useState<ProductWithVariants | null>(null);
  const [completed, setCompleted] = useState<{ order: OrderWithPayments; change: number } | null>(null);

  const cartSheet = useSheetRef();
  const variantSheet = useSheetRef();
  const discountSheet = useSheetRef();

  const totals = computeTotals(lines, discount);
  const tileWidth = (screenWidth - GRID_GUTTER * 2 - GRID_GAP) / 2;

  const sellable = useMemo(() => {
    const all = (productsQuery.data ?? []).filter((p) => p.status === 'active');
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q) || (v.barcode ?? '').includes(q))
      );
    });
  }, [productsQuery.data, query, categoryId]);

  const addVariant = (product: ProductWithVariants, variant: ProductVariant) => {
    const ok = addLine(makeCartLine(product, variant, { taxRate }));
    if (ok) {
      haptics.press();
    } else {
      haptics.warning();
      toast.warning('Not enough stock', `${product.name} has no more units available.`);
    }
  };

  const handleTilePress = (product: ProductWithVariants) => {
    if (product.variants.length === 1 && product.variants[0]) {
      addVariant(product, product.variants[0]);
    } else {
      setPicking(product);
      variantSheet.current?.present();
    }
  };

  const scanToAdd = () => {
    setScanRequest({
      mode: 'capture',
      onCapture: (code) => {
        void productsApi.findByBarcode(code).then((hit) => {
          if (!hit) {
            haptics.warning();
            toast.warning('No match', `Nothing in the catalog has barcode ${code}.`);
            return;
          }
          if (productStockStatus([hit.variant]) === 'out') {
            haptics.warning();
            toast.warning('Out of stock', hit.product.name);
            return;
          }
          addVariant(hit.product, hit.variant);
        });
      },
    });
    router.push('/scan');
  };

  const completeSale = (payments: PaymentEntry[], change: number) => {
    createSale.mutate(
      { lines, totals, payments, customerId: null },
      {
        onSuccess: (order) => {
          haptics.success();
          clearCart();
          setCompleted({ order, change });
        },
        onError: () => toast.error('Sale failed', 'Nothing was charged — try again.'),
      },
    );
  };

  const startNewSale = () => {
    setCompleted(null);
    setMode('browse');
  };

  // ---------------------------------------------------------------- complete
  if (completed) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']} contentClassName="justify-center">
        <View className="items-center">
          <SuccessCheck size={128} />
          <Animated.View
            entering={FadeInDown.delay(STAGGER_MS * 4).springify().damping(18)}
            className="mt-8 items-center"
          >
            <Text variant="h1" weight="bold">
              Sale complete
            </Text>
            <CurrencyText
              amount={completed.order.total}
              currency={currency}
              variant="displayLg"
              animated
              className="mt-2"
            />
            <Text variant="caption" tone="tertiary" className="mt-1">
              Order {completed.order.number}
            </Text>
            {completed.change > 0 ? (
              <View className="mt-4 rounded-full bg-positive-tint px-4 py-2">
                <Text variant="body" weight="semibold" tone="positive" tabular>
                  Give {formatMoney(completed.change, currency)} change
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </View>
        <Animated.View
          entering={FadeInDown.delay(STAGGER_MS * 7).springify().damping(18)}
          className="mt-12 gap-3"
        >
          <Button
            label="Share receipt"
            icon={Share2}
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => store && void shareReceiptPdf(completed.order, store)}
          />
          <Button
            label="View receipt"
            icon={ReceiptText}
            variant="ghost"
            fullWidth
            onPress={() =>
              router.push({ pathname: '/receipt/[id]', params: { id: completed.order.id } })
            }
          />
          <Button label="New sale" size="lg" fullWidth onPress={startNewSale} />
        </Animated.View>
      </Screen>
    );
  }

  // ---------------------------------------------------------------- checkout
  if (mode === 'checkout') {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']} padded={false}>
        <View className="flex-row items-center gap-3 px-5 pt-2">
          <IconButton icon={ArrowLeft} accessibilityLabel="Back to cart" onPress={() => setMode('browse')} />
          <Text variant="h1" weight="bold">
            Checkout
          </Text>
        </View>
        <CheckoutView
          currency={currency}
          totals={totals}
          busy={createSale.isPending}
          onComplete={completeSale}
        />
      </Screen>
    );
  }

  // ------------------------------------------------------------------ browse
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text variant="h1" weight="bold">
          Sell
        </Text>
        <View className="flex-row gap-2">
          <IconButton icon={ScanBarcode} variant="tonal" accessibilityLabel="Scan to add" onPress={scanToAdd} />
          <IconButton icon={X} accessibilityLabel="Close point of sale" onPress={() => router.back()} />
        </View>
      </View>

      <View className="gap-3 px-5 pb-3 pt-3">
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search products to sell" />
        {categories.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            <Chip label="All" selected={categoryId === null} onPress={() => setCategoryId(null)} />
            {categories
              .filter((c) => c.parentId === null)
              .slice(0, 6)
              .map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                />
              ))}
          </View>
        ) : null}
      </View>

      {productsQuery.isLoading ? (
        <View className="flex-row flex-wrap gap-3 px-5 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={tileWidth} height={tileWidth + 64} radius={20} />
          ))}
        </View>
      ) : sellable.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={PackageOpen}
            title="Nothing to sell"
            message={
              query || categoryId
                ? 'No products match — clear the search or filters.'
                : 'Add products to your catalog first.'
            }
            actionLabel={query || categoryId ? 'Clear filters' : 'Go to products'}
            onAction={() => {
              if (query || categoryId) {
                setQuery('');
                setCategoryId(null);
              } else {
                router.back();
              }
            }}
          />
        </View>
      ) : (
        <FlashList
          data={sellable}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: GRID_GUTTER, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeIn.delay(Math.min(index, 12) * 25)}
              style={{
                paddingBottom: GRID_GAP,
                paddingLeft: index % 2 === 1 ? GRID_GAP / 2 : 0,
                paddingRight: index % 2 === 0 ? GRID_GAP / 2 : 0,
              }}
            >
              <ProductTile
                product={item}
                currency={currency}
                width={tileWidth}
                onPress={() => handleTilePress(item)}
              />
            </Animated.View>
          )}
        />
      )}

      {totals.itemCount > 0 ? (
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          className="absolute bottom-0 left-0 right-0 px-5 pb-8"
        >
          <PressableScale
            onPress={() => cartSheet.current?.present()}
            accessibilityRole="button"
            accessibilityLabel={`Cart: ${totals.itemCount} items, ${formatMoney(totals.total, currency)}`}
            className="h-16 flex-row items-center gap-3 rounded-full bg-primary px-5"
            style={{ shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, shadowOpacity: 0.4, elevation: 10 }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <ShoppingBag size={18} color="#FFFFFF" strokeWidth={2.25} />
            </View>
            <View className="flex-1">
              <Text variant="micro" weight="medium" tone="inverse" className="opacity-80">
                {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'}
              </Text>
              <Text variant="title" weight="bold" tone="inverse" tabular>
                {formatMoney(totals.total, currency)}
              </Text>
            </View>
            <PressableScale
              onPress={() => setMode('checkout')}
              accessibilityRole="button"
              accessibilityLabel="Charge"
              className="h-10 items-center justify-center rounded-full bg-white px-5"
            >
              <Text variant="caption" weight="bold" style={{ color: '#4F46E5' }}>
                Charge
              </Text>
            </PressableScale>
          </PressableScale>
        </Animated.View>
      ) : null}

      <CartSheet
        ref={cartSheet}
        currency={currency}
        onCheckout={() => {
          cartSheet.current?.dismiss();
          setMode('checkout');
        }}
        onEditDiscount={() => discountSheet.current?.present()}
      />
      <DiscountSheet ref={discountSheet} currency={currency} dismiss={() => discountSheet.current?.dismiss()} />
      <VariantPickerSheet
        ref={variantSheet}
        product={picking}
        currency={currency}
        onPick={addVariant}
        dismiss={() => variantSheet.current?.dismiss()}
      />
    </Screen>
  );
}
