/**
 * Attribute suggestions per store vertical. These only pre-fill the variant
 * editor — merchants can define any attribute names and values they like.
 */
export interface AttributePreset {
  name: string;
  values: string[];
}

const KIDS_SIZES = ['0–6m', '6–12m', '1–2y', '2–4y', '4–6y', '6–8y', '8–10y'];
const ADULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const COLORS = ['Black', 'White', 'Sage', 'Sand', 'Navy', 'Rose', 'Sky', 'Lemon'];

const PRESETS: Record<string, AttributePreset[]> = {
  'kids-clothing': [
    { name: 'Size', values: KIDS_SIZES },
    { name: 'Color', values: COLORS },
  ],
  apparel: [
    { name: 'Size', values: ADULT_SIZES },
    { name: 'Color', values: COLORS },
  ],
  shoes: [
    { name: 'Size', values: SHOE_SIZES },
    { name: 'Color', values: COLORS },
  ],
  jewelry: [{ name: 'Material', values: ['Gold', 'Silver', 'Rose gold'] }],
  beauty: [{ name: 'Size', values: ['30ml', '50ml', '100ml'] }],
};

const FALLBACK: AttributePreset[] = [
  { name: 'Size', values: ADULT_SIZES },
  { name: 'Color', values: COLORS },
];

export function attributePresetsFor(vertical: string): AttributePreset[] {
  return PRESETS[vertical] ?? FALLBACK;
}
