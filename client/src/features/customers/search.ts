import type { Customer } from '@/types/models';

export function searchCustomers(customers: Customer[], query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)),
  );
}
