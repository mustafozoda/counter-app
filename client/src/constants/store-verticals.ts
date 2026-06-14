import type { LucideIcon } from 'lucide-react-native';
import {
  Armchair,
  Baby,
  Dumbbell,
  Footprints,
  Gem,
  Laptop,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Store,
  ToyBrick,
  BookOpen,
} from 'lucide-react-native';

export interface StoreVertical {
  id: string;
  /** i18n key (in the `vertical` namespace) resolved with `t()` at render. */
  labelKey: string;
  icon: LucideIcon;
}

/**
 * Retail verticals offered during onboarding. The vertical seeds sensible
 * default categories and variant attributes (e.g. kids' clothing → sizes by
 * age range) but never constrains the store later.
 */
export const STORE_VERTICALS: StoreVertical[] = [
  { id: 'kids-clothing', labelKey: 'vertical.kidsClothing', icon: Baby },
  { id: 'apparel', labelKey: 'vertical.apparel', icon: Shirt },
  { id: 'shoes', labelKey: 'vertical.shoes', icon: Footprints },
  { id: 'toys', labelKey: 'vertical.toys', icon: ToyBrick },
  { id: 'electronics', labelKey: 'vertical.electronics', icon: Laptop },
  { id: 'beauty', labelKey: 'vertical.beauty', icon: Sparkles },
  { id: 'jewelry', labelKey: 'vertical.jewelry', icon: Gem },
  { id: 'grocery', labelKey: 'vertical.grocery', icon: ShoppingBasket },
  { id: 'home', labelKey: 'vertical.home', icon: Armchair },
  { id: 'books', labelKey: 'vertical.books', icon: BookOpen },
  { id: 'sports', labelKey: 'vertical.sports', icon: Dumbbell },
  { id: 'other', labelKey: 'vertical.other', icon: Store },
];
