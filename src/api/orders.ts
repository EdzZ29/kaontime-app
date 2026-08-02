import { api } from './client';

export type PaymentMethod = 'cash' | 'gcash' | 'card';
export type OrderSource = 'walkin' | 'online';
export type ServiceType = 'dinein' | 'takeout' | 'delivery';
export type OrderStatus = 'preparing' | 'completed';

/** Mirrors the server constant; display only, the server applies the real fee. */
export const DELIVERY_FEE = 15;

export const ORDER_SOURCES: { value: OrderSource; label: string }[] = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'online', label: 'Online' },
];

export const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'dinein', label: 'Dine-in' },
  { value: 'takeout', label: 'Take out' },
  { value: 'delivery', label: 'Delivery' },
];

export interface OrderLineAddOn {
  id: number;
  name: string;
  price: number;
}

export interface OrderLine {
  id: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  flavorName: string | null;
  flavorPriceDelta: number;
  variantCode: string | null;
  variantName: string | null;
  sizeName: string | null;
  sizePriceDelta: number;
  note: string | null;
  lineTotal: number;
  addOns: OrderLineAddOn[];
}

export interface Order {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  completedAt: string | null;
  customerName: string | null;
  orderSource: OrderSource;
  serviceType: ServiceType;
  deliveryFee: number;
  subtotal: number;
  total: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeDue: number;
  lines: OrderLine[];
  createdAt: string;
}

/** Only ids go up — the server prices everything from the current menu. */
export interface CreateOrderInput {
  lines: {
    menuItemId: number;
    quantity: number;
    flavorId?: number;
    sizeId?: number;
    variantId?: number;
    addOnIds?: number[];
    note?: string;
  }[];
  customerName?: string;
  orderSource?: OrderSource;
  serviceType?: ServiceType;
  paymentMethod: PaymentMethod;
  amountTendered: number;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  return (await api.post<Order>('/orders', input))!;
}

export async function getOrder(id: number): Promise<Order> {
  return (await api.get<Order>(`/orders/${id}`))!;
}

/** Page sizes the table offers. The API rejects anything else. */
export const PAGE_SIZES = [5, 10, 15] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderFilters {
  status?: OrderStatus;
  /** Inclusive YYYY-MM-DD bounds. */
  from?: string;
  to?: string;
  search?: string;
}

export interface DailyTotals {
  date: string;
  revenue: number;
  cost: number;
  gross: number;
  orders: number;
}

export interface OrderSummary {
  revenue: number;
  cost: number;
  gross: number;
  orderCount: number;
  itemCount: number;
  averageOrder: number;
  byDay: DailyTotals[];
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `?${query}` : '';
}

export async function listOrders(
  page = 1,
  limit: PageSize = 10,
  filters: OrderFilters = {},
): Promise<Paginated<Order>> {
  const path = `/orders${toQuery({ page, limit, ...filters })}`;

  return (
    (await api.get<Paginated<Order>>(path)) ?? {
      items: [],
      total: 0,
      page,
      limit,
      totalPages: 1,
    }
  );
}

/** Marks an order done. Idempotent on the server. */
export async function completeOrder(id: number): Promise<Order> {
  return (await api.patch<Order>(`/orders/${id}/complete`))!;
}

export async function getOrderSummary(
  filters: Pick<OrderFilters, 'from' | 'to'> = {},
): Promise<OrderSummary> {
  return (
    (await api.get<OrderSummary>(`/orders/summary${toQuery(filters)}`)) ?? {
      revenue: 0,
      cost: 0,
      gross: 0,
      orderCount: 0,
      itemCount: 0,
      averageOrder: 0,
      byDay: [],
    }
  );
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' },
  { value: 'card', label: 'Card' },
];
