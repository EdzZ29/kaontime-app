import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { MenuItem } from '@/api/menu';
import { DELIVERY_FEE, type OrderSource, type ServiceType } from '@/api/orders';

export interface CartLine {
  /** Local id — the cart is client-side until the order is paid. */
  key: string;
  menuItemId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  variant: { id: number; code: string; name: string | null; price: number } | null;
  size: { id: number; name: string; priceDelta: number } | null;
  flavor: { id: number; name: string; priceDelta: number } | null;
  addOns: { id: number; name: string; price: number }[];
  note: string | null;
}

/**
 * Unit price including variant, size, flavor and add-ons, times quantity.
 * A variant replaces the base price; the rest stack on top.
 */
export function lineTotal(line: CartLine): number {
  const extras = line.addOns.reduce((sum, a) => sum + a.price, 0);
  const unit =
    (line.variant?.price ?? line.unitPrice) +
    (line.size?.priceDelta ?? 0) +
    (line.flavor?.priceDelta ?? 0) +
    extras;
  return Math.round(unit * line.quantity * 100) / 100;
}

interface AddLineOptions {
  quantity: number;
  sizeId: number | null;
  variantId: number | null;
  flavorId: number | null;
  addOnIds: number[];
  note: string;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  total: number;
  isStarted: boolean;
  customerName: string;
  setCustomerName: (name: string) => void;
  orderSource: OrderSource;
  setOrderSource: (source: OrderSource) => void;
  serviceType: ServiceType;
  setServiceType: (type: ServiceType) => void;
  /** DELIVERY_FEE when delivery is selected, else 0. Display only. */
  deliveryFee: number;
  subtotal: number;
  startOrder: () => void;
  addLine: (item: MenuItem, options: AddLineOptions) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderSource, setOrderSource] = useState<OrderSource>('walkin');
  const [serviceType, setServiceType] = useState<ServiceType>('dinein');

  const startOrder = useCallback(() => {
    setLines([]);
    setCustomerName('');
    setOrderSource('walkin');
    setServiceType('dinein');
    setIsStarted(true);
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setCustomerName('');
    setOrderSource('walkin');
    setServiceType('dinein');
    setIsStarted(false);
  }, []);

  const addLine = useCallback(
    (item: MenuItem, options: AddLineOptions) => {
      const { quantity, sizeId, variantId, flavorId, addOnIds, note } = options;
      const variant = item.variants.find((v) => v.id === variantId) ?? null;
      const size = item.sizes.find((z) => z.id === sizeId) ?? null;
      const flavor = item.flavors.find((f) => f.id === flavorId) ?? null;
      const addOns = item.addOns.filter((a) => addOnIds.includes(a.id));
      const trimmedNote = note.trim();

      setLines((current) => {
        // Identical configurations merge instead of stacking duplicate rows.
        // The note is part of the signature: two different notes stay separate.
        const signature = [
          item.id,
          variant?.id ?? 'novariant',
          size?.id ?? 'none',
          flavor?.id ?? 'none',
          [...addOnIds].sort((a, b) => a - b).join('+'),
          trimmedNote,
        ].join('|');

        const existing = current.find((line) => line.key === signature);

        if (existing) {
          return current.map((line) =>
            line.key === signature
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          );
        }

        return [
          ...current,
          {
            key: signature,
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            quantity,
            variant: variant
              ? {
                  id: variant.id,
                  code: variant.code,
                  name: variant.name,
                  price: variant.price,
                }
              : null,
            size: size
              ? { id: size.id, name: size.name, priceDelta: size.priceDelta }
              : null,
            flavor: flavor
              ? {
                  id: flavor.id,
                  name: flavor.name,
                  priceDelta: flavor.priceDelta,
                }
              : null,
            addOns: addOns.map((a) => ({
              id: a.id,
              name: a.name,
              price: a.price,
            })),
            note: trimmedNote || null,
          },
        ];
      });

      setIsStarted(true);
    },
    [],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) =>
            line.key === key ? { ...line, quantity } : line,
          ),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal =
      Math.round(lines.reduce((sum, line) => sum + lineTotal(line), 0) * 100) /
      100;
    // Mirrors the server: delivery adds a flat fee on top of the items.
    const deliveryFee = serviceType === 'delivery' ? DELIVERY_FEE : 0;

    return {
      lines,
      itemCount,
      subtotal,
      deliveryFee,
      total: Math.round((subtotal + deliveryFee) * 100) / 100,
      isStarted,
      customerName,
      setCustomerName,
      orderSource,
      setOrderSource,
      serviceType,
      setServiceType,
      startOrder,
      addLine,
      setQuantity,
      removeLine,
      clear,
    };
  }, [
    lines,
    isStarted,
    customerName,
    orderSource,
    serviceType,
    startOrder,
    addLine,
    setQuantity,
    removeLine,
    clear,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside a <CartProvider>');
  }

  return context;
}
