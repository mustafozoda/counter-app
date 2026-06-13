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
  label: string;
  icon: LucideIcon;
}

/**
 * Retail verticals offered during onboarding. The vertical seeds sensible
 * default categories and variant attributes (e.g. kids' clothing → sizes by
 * age range) but never constrains the store later.
 */
export const STORE_VERTICALS: StoreVertical[] = [
  { id: 'kids-clothing', label: "Kids' clothing", icon: Baby },
  { id: 'apparel', label: 'Apparel', icon: Shirt },
  { id: 'shoes', label: 'Shoes', icon: Footprints },
  { id: 'toys', label: 'Toys & games', icon: ToyBrick },
  { id: 'electronics', label: 'Electronics', icon: Laptop },
  { id: 'beauty', label: 'Beauty', icon: Sparkles },
  { id: 'jewelry', label: 'Jewelry', icon: Gem },
  { id: 'grocery', label: 'Grocery', icon: ShoppingBasket },
  { id: 'home', label: 'Home & living', icon: Armchair },
  { id: 'books', label: 'Books & stationery', icon: BookOpen },
  { id: 'sports', label: 'Sports', icon: Dumbbell },
  { id: 'other', label: 'Something else', icon: Store },
];
