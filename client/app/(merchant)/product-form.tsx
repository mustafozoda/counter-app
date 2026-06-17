import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { z } from 'zod';

import {
  Button,
  IconButton,
  ImagePickerGrid,
  PressableScale,
  Screen,
  Skeleton,
  SwitchRow,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import type { ProductInput } from '@/api/products';
import { attributePresetsFor } from '@/features/products/attribute-presets';
import { CategoryPickerSheet, SupplierPickerSheet } from '@/features/products/components/picker-sheets';
import {
  AttributeEditor,
  buildRows,
  rowsFromVariants,
  signatureOf,
  VariantMatrix,
  MAX_COMBINATIONS,
  type AttributeDef,
  type VariantRow,
} from '@/features/products/components/variant-editor';
import { useCategories, useProduct, useSaveProduct } from '@/features/products/hooks';
import { useSuppliers } from '@/features/suppliers/hooks';
import { generateSku, marginRatio } from '@/features/products/stock';
import { getCurrencySpec, formatPercentDelta } from '@/lib/format';
import { useScannerStore } from '@/stores/scanner';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

const numeric = (v: string) => Number.parseFloat(v.replace(',', '.'));

interface FormValues {
  name: string;
  brand: string;
  description: string;
  price: string;
  cost: string;
  taxRate: string;
}

function defaultRow(name: string): VariantRow {
  return {
    signature: signatureOf({}),
    attributes: {},
    sku: generateSku(name || 'Product', []),
    barcode: '',
    stock: '0',
    priceOverride: '',
    threshold: '4',
  };
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="h2" weight="semibold" className="mb-3 mt-7">
      {children}
    </Text>
  );
}

export default withPermission(ProductFormScreen, 'manage_inventory');

function ProductFormScreen() {
  const params = useLocalSearchParams<{ id?: string; barcode?: string }>();
  const editingId = params.id;
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const store = useStoreProfile((s) => s.store);
  const currencySymbol = getCurrencySpec(store?.currencyCode ?? 'TJS').symbol;
  const vertical = store?.vertical ?? 'other';
  const presets = useMemo(() => attributePresetsFor(vertical), [vertical]);

  const productQuery = useProduct(editingId ?? '');
  const existing = editingId ? productQuery.data : null;
  const categories = useCategories().data ?? [];
  const suppliers = useSuppliers().data ?? [];
  const save = useSaveProduct();
  const setScanRequest = useScannerStore((s) => s.setRequest);

  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('product.validName')),
        brand: z.string(),
        description: z.string(),
        price: z
          .string()
          .refine((v) => Number.isFinite(numeric(v)) && numeric(v) > 0, t('product.validPrice')),
        cost: z
          .string()
          .refine((v) => v.trim() === '' || (Number.isFinite(numeric(v)) && numeric(v) >= 0), t('product.invalidCost')),
        taxRate: z
          .string()
          .refine(
            (v) => v.trim() === '' || (Number.isFinite(numeric(v)) && numeric(v) >= 0 && numeric(v) <= 100),
            t('product.taxRange'),
          ),
      }),
    [t],
  );

  const { control, handleSubmit, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', brand: '', description: '', price: '', cost: '', taxRate: '' },
  });

  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [attributes, setAttributes] = useState<AttributeDef[]>([]);
  const [rows, setRows] = useState<VariantRow[]>([
    { ...defaultRow(''), barcode: params.barcode ?? '' },
  ]);
  const [truncated, setTruncated] = useState(false);
  const hydrated = useRef(false);

  const categorySheet = useSheetRef();
  const supplierSheet = useSheetRef();
  const watchedName = watch('name');
  const watchedPrice = watch('price');
  const watchedCost = watch('cost');

  // Hydrate once when editing.
  useEffect(() => {
    if (!existing || hydrated.current) return;
    hydrated.current = true;
    reset({
      name: existing.name,
      brand: existing.brand ?? '',
      description: existing.description,
      price: String(existing.basePrice),
      cost: existing.cost > 0 ? String(existing.cost) : '',
      taxRate: existing.taxRate !== null ? String(existing.taxRate * 100) : '',
    });
    setImages(existing.images);
    setCategoryId(existing.categoryId);
    setSupplierId(existing.supplierId);
    setIsDraft(existing.status === 'draft');
    const derived = rowsFromVariants(existing.variants);
    const variantful = derived.attributes.length > 0;
    setHasVariants(variantful);
    setAttributes(derived.attributes);
    setRows(derived.rows);
  }, [existing, reset]);

  // Rebuild the matrix when attribute definitions change.
  const applyAttributes = (next: AttributeDef[]) => {
    setAttributes(next);
    const result = buildRows(watchedName, next, rows);
    setRows(result.rows);
    setTruncated(result.truncated);
  };

  const toggleVariants = (on: boolean) => {
    setHasVariants(on);
    if (on) {
      const result = buildRows(watchedName, attributes, rows);
      setRows(result.rows);
      setTruncated(result.truncated);
    } else {
      setAttributes([]);
      setRows((prev) => {
        const first = prev[0];
        const base = defaultRow(watchedName);
        return [first ? { ...first, attributes: {}, signature: base.signature } : base];
      });
      setTruncated(false);
    }
  };

  const scanForRow = (signature: string) => {
    setScanRequest({
      mode: 'capture',
      onCapture: (code) =>
        setRows((prev) => prev.map((r) => (r.signature === signature ? { ...r, barcode: code } : r))),
    });
    router.push('/scan');
  };

  const onSubmit = handleSubmit((values) => {
    if (rows.length === 0) {
      toast.error(t('product.noVariants'), t('product.addVariantValue'));
      return;
    }
    const skus = rows.map((r) => r.sku.trim());
    if (skus.some((s) => s === '')) {
      toast.error(t('product.missingSku'), t('product.everyVariantSku'));
      return;
    }
    if (new Set(skus).size !== skus.length) {
      toast.error(t('product.dupSku'), t('product.dupSkuBody'));
      return;
    }
    const barcodes = rows.map((r) => r.barcode.trim()).filter((b) => b !== '');
    if (new Set(barcodes).size !== barcodes.length) {
      toast.error(t('product.dupBarcode'), t('product.dupBarcodeBody'));
      return;
    }

    const taxRaw = values.taxRate.trim();
    const costRaw = values.cost.trim();
    const input: ProductInput = {
      name: values.name.trim(),
      description: values.description.trim(),
      brand: values.brand.trim() || null,
      categoryId,
      supplierId,
      images,
      cost: costRaw === '' ? 0 : numeric(costRaw),
      basePrice: numeric(values.price),
      taxRate: taxRaw === '' ? null : numeric(taxRaw) / 100,
      status: isDraft ? 'draft' : existing?.status === 'archived' ? 'archived' : 'active',
      variants: rows.map((row) => {
        const override = row.priceOverride.trim();
        return {
          id: row.id,
          attributes: row.attributes,
          sku: row.sku.trim(),
          barcode: row.barcode.trim() || null,
          stockQty: Math.max(0, Math.floor(numeric(row.stock) || 0)),
          priceOverride:
            override !== '' && Number.isFinite(numeric(override)) && numeric(override) > 0
              ? numeric(override)
              : null,
          lowStockThreshold: Math.max(0, Math.floor(numeric(row.threshold) || 0)),
        };
      }),
    };

    save.mutate(
      { id: editingId, input },
      {
        onSuccess: () => {
          toast.success(editingId ? t('product.productUpdated') : t('product.productAdded'), input.name);
          router.back();
        },
        onError: () => toast.error(t('product.couldNotSave')),
      },
    );
  });

  const margin = marginRatio(numeric(watchedCost || '0') || 0, numeric(watchedPrice || '0') || 0);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  if (editingId && productQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} keyboardAvoid>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
        <Text variant="title" weight="semibold">
          {editingId ? t('product.editProduct') : t('product.newProduct')}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle>{t('product.photos')}</SectionTitle>
        <ImagePickerGrid images={images} onChange={setImages} />

        <SectionTitle>{t('product.basics')}</SectionTitle>
        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <TextField
                label={t('product.productName')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="brand"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label={t('product.brandOptional')} value={value} onChangeText={onChange} onBlur={onBlur} />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={t('product.descriptionOptional')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
              />
            )}
          />
          <PressableScale
            scaleTo={0.98}
            onPress={() => categorySheet.current?.present()}
            accessibilityRole="button"
            accessibilityLabel={t('product.categoryA11y', { name: selectedCategory?.name ?? t('product.noCategory') })}
            className="h-14 flex-row items-center justify-between rounded-md border border-hairline bg-surface px-4 dark:bg-surface-elevated"
          >
            <View>
              <Text variant="micro" weight="medium" tone="tertiary">
                {t('product.category')}
              </Text>
              <Text variant="body" weight={selectedCategory ? 'medium' : 'regular'} tone={selectedCategory ? 'primary' : 'tertiary'}>
                {selectedCategory?.name ?? t('product.noCategory')}
              </Text>
            </View>
            <ChevronDown size={20} color={colors.inkTertiary} strokeWidth={2} />
          </PressableScale>
          <PressableScale
            scaleTo={0.98}
            onPress={() => supplierSheet.current?.present()}
            accessibilityRole="button"
            className="h-14 flex-row items-center justify-between rounded-md border border-hairline bg-surface px-4 dark:bg-surface-elevated"
          >
            <View>
              <Text variant="micro" weight="medium" tone="tertiary">
                {t('product.supplier')}
              </Text>
              <Text
                variant="body"
                weight={selectedSupplier ? 'medium' : 'regular'}
                tone={selectedSupplier ? 'primary' : 'tertiary'}
              >
                {selectedSupplier?.name ?? t('product.noSupplier')}
              </Text>
            </View>
            <ChevronDown size={20} color={colors.inkTertiary} strokeWidth={2} />
          </PressableScale>
        </View>

        <SectionTitle>{t('product.pricing')}</SectionTitle>
        <View className="gap-4">
          <View className="flex-row gap-3">
            <Controller
              control={control}
              name="price"
              render={({ field: { value, onChange, onBlur }, fieldState }) => (
                <TextField
                  label={t('product.sellingPrice')}
                  prefix={currencySymbol}
                  value={value}
                  onChangeText={(v) => onChange(v.replace(',', '.'))}
                  onBlur={onBlur}
                  error={fieldState.error?.message}
                  keyboardType="decimal-pad"
                  containerClassName="flex-1"
                />
              )}
            />
            <Controller
              control={control}
              name="cost"
              render={({ field: { value, onChange, onBlur }, fieldState }) => (
                <TextField
                  label={t('product.costOptional')}
                  prefix={currencySymbol}
                  value={value}
                  onChangeText={(v) => onChange(v.replace(',', '.'))}
                  onBlur={onBlur}
                  error={fieldState.error?.message}
                  keyboardType="decimal-pad"
                  containerClassName="flex-1"
                />
              )}
            />
          </View>
          {margin !== null && (watchedCost ?? '').trim() !== '' ? (
            <Text variant="caption" tone={margin >= 0 ? 'positive' : 'negative'} className="px-1" tabular>
              {margin >= 0
                ? t('product.marginEverySale', { percent: formatPercentDelta(margin).replace('+', '') })
                : t('product.sellingBelowCost')}
            </Text>
          ) : null}
          <Controller
            control={control}
            name="taxRate"
            render={({ field: { value, onChange, onBlur }, fieldState }) => (
              <TextField
                label={t('product.taxOverride')}
                value={value}
                onChangeText={(v) => onChange(v.replace(',', '.'))}
                onBlur={onBlur}
                error={fieldState.error?.message}
                keyboardType="decimal-pad"
                helper={t('product.taxHelper')}
              />
            )}
          />
        </View>

        <SectionTitle>{t('product.inventoryVariants')}</SectionTitle>
        <View className="gap-4">
          <SwitchRow
            label={t('product.hasVariants')}
            caption={t('product.variantsCaption')}
            value={hasVariants}
            onChange={toggleVariants}
          />
          {hasVariants ? (
            <AttributeEditor attributes={attributes} onChange={applyAttributes} presets={presets} />
          ) : null}
          {truncated ? (
            <Text variant="caption" tone="caution" className="px-1">
              {t('product.truncated', { max: MAX_COMBINATIONS })}
            </Text>
          ) : null}
          <VariantMatrix
            rows={rows}
            onChange={setRows}
            currencySymbol={currencySymbol}
            onScanBarcode={scanForRow}
          />
        </View>

        <View className="mt-8 gap-4">
          <SwitchRow
            label={t('product.saveAsDraft')}
            caption={t('product.draftCaption')}
            value={isDraft}
            onChange={setIsDraft}
          />
          <Button
            label={editingId ? t('common.saveChanges') : t('product.addProductBtn')}
            size="lg"
            fullWidth
            loading={save.isPending}
            onPress={onSubmit}
          />
        </View>
      </ScrollView>

      <CategoryPickerSheet
        ref={categorySheet}
        categories={categories}
        selected={categoryId}
        nullLabel={t('product.noCategory')}
        onSelect={setCategoryId}
        dismiss={() => categorySheet.current?.dismiss()}
      />
      <SupplierPickerSheet
        ref={supplierSheet}
        suppliers={suppliers}
        selected={supplierId}
        nullLabel={t('product.noSupplier')}
        onSelect={setSupplierId}
        dismiss={() => supplierSheet.current?.dismiss()}
      />
    </Screen>
  );
}
