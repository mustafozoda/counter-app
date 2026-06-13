import type { VariantInput } from '@/api/products';
import type { Category, Product } from '@/types/models';

import { generateSku } from './stock';

/**
 * Seed content. Default categories install silently on first run; the demo
 * catalog is opt-in from the catalog empty state so a merchant's real store
 * never fills with phantom goods uninvited.
 */
const CATEGORY_SEEDS: Record<string, string[]> = {
  'kids-clothing': ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Sleepwear', 'Accessories'],
  apparel: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories'],
  shoes: ['Sneakers', 'Boots', 'Sandals', 'Formal'],
  toys: ['Building', 'Dolls & figures', 'Games', 'Outdoor'],
  electronics: ['Phones', 'Audio', 'Accessories', 'Cables & chargers'],
  beauty: ['Skincare', 'Makeup', 'Hair', 'Fragrance'],
  grocery: ['Fresh', 'Pantry', 'Drinks', 'Snacks'],
};

export function defaultCategoriesFor(vertical: string): string[] {
  return CATEGORY_SEEDS[vertical] ?? ['General', 'New arrivals', 'Sale'];
}

export interface SampleProduct {
  product: Omit<Product, 'id'>;
  variants: VariantInput[];
}

interface SampleSpec {
  name: string;
  brand: string;
  category: string;
  description: string;
  cost: number;
  price: number;
  attrs: Record<string, string>[];
  /** Stock per variant, aligned with `attrs`; default 12. */
  stock?: number[];
  lowThreshold?: number;
}

const KIDS_SAMPLES: SampleSpec[] = [
  {
    name: 'Dino Hoodie',
    brand: 'Tiny Trek',
    category: 'Tops',
    description: 'Brushed fleece hoodie with a stegosaurus spine hood. Pre-washed, holds color.',
    cost: 9.5,
    price: 24.0,
    attrs: [
      { Size: '2–4y', Color: 'Sage' },
      { Size: '4–6y', Color: 'Sage' },
      { Size: '6–8y', Color: 'Sage' },
      { Size: '2–4y', Color: 'Navy' },
      { Size: '4–6y', Color: 'Navy' },
    ],
    stock: [14, 9, 3, 11, 0],
  },
  {
    name: 'Rainbow Tutu Dress',
    brand: 'Pip & Plume',
    category: 'Dresses',
    description: 'Layered tulle skirt with a soft cotton bodice. Twirl-tested.',
    cost: 11.0,
    price: 32.0,
    attrs: [{ Size: '2–4y' }, { Size: '4–6y' }, { Size: '6–8y' }],
    stock: [8, 12, 5],
  },
  {
    name: 'Everyday Joggers',
    brand: 'Tiny Trek',
    category: 'Bottoms',
    description: 'Stretchy terry joggers with a reinforced knee. Survives playgrounds.',
    cost: 6.2,
    price: 16.5,
    attrs: [
      { Size: '1–2y', Color: 'Sand' },
      { Size: '2–4y', Color: 'Sand' },
      { Size: '4–6y', Color: 'Sand' },
      { Size: '2–4y', Color: 'Black' },
    ],
    stock: [10, 16, 2, 13],
  },
  {
    name: 'Puddle Parka',
    brand: 'Cloudling',
    category: 'Outerwear',
    description: 'Waterproof shell with fleece lining and reflective trim.',
    cost: 18.0,
    price: 45.0,
    attrs: [
      { Size: '2–4y', Color: 'Lemon' },
      { Size: '4–6y', Color: 'Lemon' },
      { Size: '6–8y', Color: 'Sky' },
    ],
    stock: [6, 4, 7],
  },
  {
    name: 'Star Sleeper Set',
    brand: 'Moonmilk',
    category: 'Sleepwear',
    description: 'Two-piece organic cotton pajamas with glow-in-the-dark stars.',
    cost: 7.4,
    price: 19.0,
    attrs: [{ Size: '1–2y' }, { Size: '2–4y' }, { Size: '4–6y' }, { Size: '6–8y' }],
    stock: [9, 1, 15, 8],
  },
  {
    name: 'Chunky Knit Beanie',
    brand: 'Pip & Plume',
    category: 'Accessories',
    description: 'Hand-feel acrylic knit with a pom. One size fits 2–8y.',
    cost: 2.8,
    price: 9.5,
    attrs: [{ Color: 'Rose' }, { Color: 'Sage' }, { Color: 'Navy' }],
    stock: [22, 18, 0],
    lowThreshold: 5,
  },
  {
    name: 'First Steps Tee',
    brand: 'Moonmilk',
    category: 'Tops',
    description: 'Featherweight jersey tee with envelope shoulders for easy changes.',
    cost: 3.1,
    price: 11.0,
    attrs: [
      { Size: '6–12m', Color: 'White' },
      { Size: '1–2y', Color: 'White' },
      { Size: '6–12m', Color: 'Sand' },
    ],
    stock: [25, 19, 12],
  },
  {
    name: 'Adventure Cargo Shorts',
    brand: 'Tiny Trek',
    category: 'Bottoms',
    description: 'Six pockets for six treasures. Quick-dry twill.',
    cost: 5.0,
    price: 14.0,
    attrs: [{ Size: '4–6y' }, { Size: '6–8y' }, { Size: '8–10y' }],
    stock: [3, 6, 9],
  },
];

const GENERIC_SAMPLES: SampleSpec[] = [
  {
    name: 'Signature Tee',
    brand: 'House Brand',
    category: 'General',
    description: 'Heavyweight combed cotton, relaxed fit.',
    cost: 4.5,
    price: 15.0,
    attrs: [{ Size: 'S' }, { Size: 'M' }, { Size: 'L' }, { Size: 'XL' }],
    stock: [12, 18, 9, 2],
  },
  {
    name: 'Daily Tote',
    brand: 'House Brand',
    category: 'General',
    description: 'Canvas tote with internal pocket.',
    cost: 3.2,
    price: 12.0,
    attrs: [{ Color: 'Sand' }, { Color: 'Black' }],
    stock: [20, 0],
  },
  {
    name: 'Gift Card Sleeve',
    brand: 'House Brand',
    category: 'Sale',
    description: 'Kraft sleeve with foil logo.',
    cost: 0.4,
    price: 2.0,
    attrs: [{}],
    stock: [48],
  },
];

let barcodeCounter = 0;
function nextBarcode(): string {
  barcodeCounter += 1;
  return `478${String(1000000000 + barcodeCounter).slice(-10)}`;
}

export function sampleCatalogFor(vertical: string, categories: Category[]): SampleProduct[] {
  const specs = vertical === 'kids-clothing' ? KIDS_SAMPLES : GENERIC_SAMPLES;
  const categoryId = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
  const now = Date.now();

  return specs.map((spec, index) => ({
    product: {
      name: spec.name,
      description: spec.description,
      brand: spec.brand,
      categoryId: categoryId(spec.category),
      images: [],
      cost: spec.cost,
      basePrice: spec.price,
      taxRate: null,
      status: 'active',
      // Stagger creation times so "newest" sorting looks natural.
      createdAt: new Date(now - index * 36e5).toISOString(),
    },
    variants: spec.attrs.map((attributes, vIndex) => ({
      attributes,
      sku: generateSku(spec.name, Object.values(attributes)),
      barcode: nextBarcode(),
      stockQty: spec.stock?.[vIndex] ?? 12,
      priceOverride: null,
      lowStockThreshold: spec.lowThreshold ?? 4,
    })),
  }));
}
