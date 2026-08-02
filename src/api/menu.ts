import { api } from './client';

/** Preset categories offered in the form; a custom one can still be typed. */
export const MENU_CATEGORIES = ['Snacks', 'Rice Meals', 'Drinks'] as const;

export interface MenuAddOn {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface MenuFlavor {
  id: number;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}

/** A coded version of a product with its own absolute price, e.g. CP1 / CPS. */
export interface MenuVariant {
  id: number;
  code: string;
  name: string | null;
  /** Absolute — replaces the base price when chosen. */
  price: number;
  isAvailable: boolean;
}

export interface MenuSize {
  id: number;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  /** Cost to make one; drives gross-profit reporting. */
  cost: number;
  category: string;
  imageUrl: string | null;
  addOns: MenuAddOn[];
  flavors: MenuFlavor[];
  sizes: MenuSize[];
  variants: MenuVariant[];
}

/** Shape the create/edit form sends. Ids are assigned by the server. */
export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  cost?: number;
  category?: string;
  addOns?: { name: string; price: number }[];
  flavors?: { name: string; priceDelta: number }[];
  sizes?: { name: string; priceDelta: number }[];
  variants?: { code: string; name?: string; price: number }[];
}

export async function listMenu(): Promise<MenuItem[]> {
  return (await api.get<MenuItem[]>('/menu')) ?? [];
}

export async function getMenuItem(id: number): Promise<MenuItem> {
  return (await api.get<MenuItem>(`/menu/${id}`))!;
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItem> {
  return (await api.post<MenuItem>('/menu', input))!;
}

export async function updateMenuItem(
  id: number,
  input: Partial<MenuItemInput>,
): Promise<MenuItem> {
  return (await api.patch<MenuItem>(`/menu/${id}`, input))!;
}

export async function deleteMenuItem(id: number): Promise<void> {
  await api.delete(`/menu/${id}`);
}

/** Groups items by category, preserving the server's alphabetical ordering. */
export function groupByCategory(items: MenuItem[]): [string, MenuItem[]][] {
  const groups = new Map<string, MenuItem[]>();

  for (const item of items) {
    const key = item.category || 'Uncategorized';
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return [...groups.entries()];
}

export const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
