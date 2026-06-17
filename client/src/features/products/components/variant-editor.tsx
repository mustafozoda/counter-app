import { Plus, ScanBarcode, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Card, Chip, PressableScale, Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { springs, textStyle, useTheme } from '@/theme';
import type { ProductVariant } from '@/types/models';

import type { AttributePreset } from '../attribute-presets';
import { generateSku, variantLabel } from '../stock';

// ---------------------------------------------------------------------------
// Editor state model
// ---------------------------------------------------------------------------

export interface AttributeDef {
  name: string;
  values: string[];
}

export interface VariantRow {
  /** Present when this row maps to an existing stored variant. */
  id?: string;
  signature: string;
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  /** Opening stock — editable for new rows only; existing stock moves via adjustments. */
  stock: string;
  priceOverride: string;
  threshold: string;
}

export const MAX_COMBINATIONS = 48;

export function signatureOf(attributes: Record<string, string>): string {
  return Object.keys(attributes)
    .sort()
    .map((k) => `${k}=${attributes[k]}`)
    .join('|');
}

function cartesian(attributes: AttributeDef[]): Record<string, string>[] {
  const active = attributes.filter((a) => a.values.length > 0);
  if (active.length === 0) return [{}];
  return active.reduce<Record<string, string>[]>(
    (combos, attr) =>
      combos.flatMap((combo) => attr.values.map((value) => ({ ...combo, [attr.name]: value }))),
    [{}],
  );
}

/** Regenerate the matrix, preserving rows the merchant already touched. */
export function buildRows(
  productName: string,
  attributes: AttributeDef[],
  previous: VariantRow[],
): { rows: VariantRow[]; truncated: boolean } {
  const combos = cartesian(attributes);
  const truncated = combos.length > MAX_COMBINATIONS;
  const kept = combos.slice(0, MAX_COMBINATIONS);
  const bySignature = new Map(previous.map((r) => [r.signature, r]));

  const rows = kept.map((attrs) => {
    const signature = signatureOf(attrs);
    const existing = bySignature.get(signature);
    if (existing) return { ...existing, attributes: attrs };
    return {
      signature,
      attributes: attrs,
      sku: generateSku(productName, Object.values(attrs)),
      barcode: '',
      stock: '0',
      priceOverride: '',
      threshold: '4',
    };
  });
  return { rows, truncated };
}

/** Rebuild editor state from a stored product's variants (edit mode). */
export function rowsFromVariants(variants: ProductVariant[]): {
  attributes: AttributeDef[];
  rows: VariantRow[];
} {
  const attributeOrder: string[] = [];
  const valuesByName = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.attributes)) {
      if (!valuesByName.has(name)) {
        valuesByName.set(name, []);
        attributeOrder.push(name);
      }
      const values = valuesByName.get(name)!;
      if (!values.includes(value)) values.push(value);
    }
  }
  return {
    attributes: attributeOrder.map((name) => ({ name, values: valuesByName.get(name)! })),
    rows: variants.map((v) => ({
      id: v.id,
      signature: signatureOf(v.attributes),
      attributes: v.attributes,
      sku: v.sku,
      barcode: v.barcode ?? '',
      stock: String(v.stockQty),
      priceOverride: v.priceOverride !== null ? String(v.priceOverride) : '',
      threshold: String(v.lowStockThreshold),
    })),
  };
}

// ---------------------------------------------------------------------------
// Attribute editor
// ---------------------------------------------------------------------------

interface AttributeEditorProps {
  attributes: AttributeDef[];
  onChange: (attributes: AttributeDef[]) => void;
  presets: AttributePreset[];
}

function ValueInput({ onAdd, placeholder }: { onAdd: (value: string) => void; placeholder: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const commit = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText('');
  };

  return (
    <View className="h-9 flex-row items-center gap-1 rounded-full border border-dashed border-ink-tertiary/50 pl-3 pr-1">
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={commit}
        placeholder={placeholder}
        placeholderTextColor={colors.inkTertiary}
        className="min-w-16 text-ink"
        style={[textStyle('caption'), { paddingVertical: 0 }]}
        submitBehavior="submit"
        accessibilityLabel={placeholder}
      />
      <Pressable
        onPress={commit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('product.addValue')}
        className="h-7 w-7 items-center justify-center rounded-full bg-primary-tint"
      >
        <Plus size={14} color={colors.primary} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

/** Define option groups (Size, Color…) whose combinations become variants. */
export function AttributeEditor({ attributes, onChange, presets }: AttributeEditorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const updateAttr = (index: number, patch: Partial<AttributeDef>) =>
    onChange(attributes.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const unusedPresets = presets.filter((p) => !attributes.some((a) => a.name === p.name));

  return (
    <View className="gap-3">
      {attributes.map((attr, index) => {
        const preset = presets.find((p) => p.name === attr.name);
        const suggestions = (preset?.values ?? []).filter((v) => !attr.values.includes(v));
        return (
          <Animated.View key={attr.name} layout={LinearTransition.springify().damping(20)}>
            <Card elevation="none" className="gap-3 p-4">
              <View className="flex-row items-center justify-between">
                <Text variant="body" weight="semibold">
                  {attr.name}
                </Text>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    onChange(attributes.filter((_, i) => i !== index));
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('product.removeAttr', { name: attr.name })}
                >
                  <X size={16} color={colors.inkTertiary} strokeWidth={2} />
                </Pressable>
              </View>
              <View className="flex-row flex-wrap items-center gap-2">
                {attr.values.map((value) => (
                  <Chip
                    key={value}
                    label={`${value}  ×`}
                    selected
                    className="h-9"
                    onPress={() =>
                      updateAttr(index, { values: attr.values.filter((v) => v !== value) })
                    }
                  />
                ))}
                <ValueInput
                  placeholder={t('product.addAttrValue', { name: attr.name.toLowerCase() })}
                  onAdd={(value) => {
                    if (!attr.values.includes(value)) {
                      updateAttr(index, { values: [...attr.values, value] });
                    }
                  }}
                />
              </View>
              {suggestions.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {suggestions.slice(0, 8).map((value) => (
                    <Chip
                      key={value}
                      label={`+ ${value}`}
                      className="h-9"
                      onPress={() => updateAttr(index, { values: [...attr.values, value] })}
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          </Animated.View>
        );
      })}

      {unusedPresets.length > 0 || attributes.length === 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {unusedPresets.map((preset) => (
            <Chip
              key={preset.name}
              icon={Plus}
              label={preset.name}
              onPress={() => onChange([...attributes, { name: preset.name, values: [] }])}
            />
          ))}
          <NewAttributeChip
            onAdd={(name) => {
              if (!attributes.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
                onChange([...attributes, { name, values: [] }]);
              }
            }}
          />
        </View>
      ) : (
        <NewAttributeChip
          onAdd={(name) => {
            if (!attributes.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
              onChange([...attributes, { name, values: [] }]);
            }
          }}
        />
      )}
    </View>
  );
}

function NewAttributeChip({ onAdd }: { onAdd: (name: string) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  if (!editing) {
    return <Chip icon={Plus} label={t('product.customAttribute')} onPress={() => setEditing(true)} />;
  }

  const commit = () => {
    const value = name.trim();
    if (value) onAdd(value);
    setName('');
    setEditing(false);
  };

  return (
    <View className="h-11 flex-row items-center gap-2 rounded-full border border-primary px-4">
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={commit}
        onBlur={commit}
        placeholder={t('product.attributeName')}
        placeholderTextColor={colors.inkTertiary}
        autoFocus
        className="min-w-24 text-ink"
        style={[textStyle('caption'), { paddingVertical: 0 }]}
        accessibilityLabel={t('product.attributeName')}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Variant matrix
// ---------------------------------------------------------------------------

interface VariantMatrixProps {
  rows: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  currencySymbol: string;
  onScanBarcode: (signature: string) => void;
}

function MatrixField({
  label,
  value,
  onChangeText,
  flex = 1,
  keyboardType,
  editable = true,
  mono = false,
  accessory,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  flex?: number;
  keyboardType?: 'decimal-pad' | 'number-pad';
  editable?: boolean;
  mono?: boolean;
  accessory?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex }} className="gap-1">
      <Text variant="micro" weight="medium" tone="tertiary" numberOfLines={1}>
        {label}
      </Text>
      <View
        className={`h-10 flex-row items-center rounded-sm border border-hairline px-2.5 ${
          editable ? 'bg-surface dark:bg-surface-elevated' : 'bg-surface-sunken dark:bg-surface'
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={editable}
          className="flex-1 text-ink"
          style={[textStyle('caption', undefined, { mono, tabular: true }), { paddingVertical: 0 }]}
          placeholderTextColor={colors.inkTertiary}
          accessibilityLabel={label}
        />
        {accessory}
      </View>
    </View>
  );
}

/** One editable card per variant combination. */
export function VariantMatrix({ rows, onChange, currencySymbol, onScanBarcode }: VariantMatrixProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const patchRow = (signature: string, patch: Partial<VariantRow>) =>
    onChange(rows.map((r) => (r.signature === signature ? { ...r, ...patch } : r)));

  return (
    <View className="gap-3">
      {rows.map((row, index) => (
        <Animated.View
          key={row.signature}
          entering={FadeInDown.delay(Math.min(index, 8) * 30).springify().damping(springs.standard.damping)}
          layout={LinearTransition.springify().damping(20)}
        >
          <Card elevation="none" className="gap-3 p-4">
            <View className="flex-row items-center justify-between">
              <Text variant="body" weight="semibold">
                {variantLabel({ attributes: row.attributes } as ProductVariant)}
              </Text>
              {row.id ? (
                <Text variant="micro" tone="tertiary">
                  {t('product.onHand', { count: Number(row.stock) })}
                </Text>
              ) : null}
            </View>
            <View className="flex-row gap-2.5">
              <MatrixField
                label={t('product.sku')}
                value={row.sku}
                mono
                onChangeText={(sku) => patchRow(row.signature, { sku })}
                flex={1.3}
              />
              <MatrixField
                label={t('product.barcode')}
                value={row.barcode}
                mono
                onChangeText={(barcode) => patchRow(row.signature, { barcode })}
                flex={1.3}
                accessory={
                  <PressableScale
                    onPress={() => onScanBarcode(row.signature)}
                    haptic="tap"
                    accessibilityRole="button"
                    accessibilityLabel={t('product.scanBarcode')}
                    className="ml-1 h-7 w-7 items-center justify-center rounded-full bg-primary-tint"
                  >
                    <ScanBarcode size={14} color={colors.primary} strokeWidth={2} />
                  </PressableScale>
                }
              />
            </View>
            <View className="flex-row gap-2.5">
              <MatrixField
                label={t('product.priceOverrideSym', { symbol: currencySymbol })}
                value={row.priceOverride}
                keyboardType="decimal-pad"
                onChangeText={(priceOverride) =>
                  patchRow(row.signature, { priceOverride: priceOverride.replace(',', '.') })
                }
              />
              <MatrixField
                label={row.id ? t('product.stockViaAdjustments') : t('product.openingStock')}
                value={row.stock}
                keyboardType="number-pad"
                editable={!row.id}
                onChangeText={(stock) => patchRow(row.signature, { stock })}
              />
              <MatrixField
                label={t('product.lowAlertAt')}
                value={row.threshold}
                keyboardType="number-pad"
                onChangeText={(threshold) => patchRow(row.signature, { threshold })}
              />
            </View>
          </Card>
        </Animated.View>
      ))}
    </View>
  );
}
