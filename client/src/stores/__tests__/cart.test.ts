import type { CartLine } from '@/features/pos/totals';

import { useCartStore } from '../cart';

const lineInput = (overrides: Partial<Omit<CartLine, 'qty'>> = {}): Omit<CartLine, 'qty'> => ({
  variantId: 'v1',
  productId: 'p1',
  productName: 'Dino Hoodie',
  variantLabel: '2–4y',
  sku: 'DIN-1',
  unitPrice: 24,
  taxRate: 0,
  available: 3,
  imageUri: null,
  ...overrides,
});

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.setState({ lines: [], discount: null });
  });

  it('adds and bumps lines up to available stock', () => {
    const { addLine } = useCartStore.getState();
    expect(addLine(lineInput())).toBe(true);
    expect(addLine(lineInput())).toBe(true);
    expect(addLine(lineInput())).toBe(true);
    expect(addLine(lineInput())).toBe(false); // 4th unit exceeds available=3
    expect(useCartStore.getState().lines[0]?.qty).toBe(3);
  });

  it('clamps setQty to stock and removes at zero', () => {
    const { addLine, setQty } = useCartStore.getState();
    addLine(lineInput());
    setQty('v1', 99);
    expect(useCartStore.getState().lines[0]?.qty).toBe(3);
    setQty('v1', 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('clears lines and discount together', () => {
    const { addLine, setDiscount, clear } = useCartStore.getState();
    addLine(lineInput());
    setDiscount({ kind: 'percent', value: 10 });
    clear();
    expect(useCartStore.getState().lines).toHaveLength(0);
    expect(useCartStore.getState().discount).toBeNull();
  });
});
