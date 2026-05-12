/** Food trader module types. */

export type FoodIntent =
  | "BROWSE_MENU"
  | "PLACE_ORDER"
  | "ITEM_PRICE"
  | "ORDER_STATUS"
  | "CANCEL_ORDER"
  | "DELIVERY_FAQ"
  | "GENERAL_FAQ"
  | "OWNER_STATUS_CMD"
  | "UNKNOWN";

export interface FoodConfig {
  /** Delivery fee in kobo. */
  delivery_fee_kobo?: number;
  /** Currency display, defaults to NGN. */
  currency?: string;
  /** Owner's E.164 phone (no `whatsapp:` prefix) — can run owner status commands. */
  owner_phone?: string;
  /** Free-form delivery FAQ. */
  delivery_faq?: string;
  /** Minimum order in kobo. */
  min_order_kobo?: number;
}

export interface MenuItem {
  id: string;
  business_id: string;
  name: string;
  description: string;
  category: string;
  price_kobo: number;
  available: boolean;
  sort_order: number;
}

export interface OrderItem {
  menu_item_id: string;
  name: string;
  qty: number;
  unit_price_kobo: number;
  line_total_kobo: number;
}

export type FoodOrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface FoodOrder {
  id: string;
  business_id: string;
  customer_number: string;
  customer_name: string | null;
  items: OrderItem[];
  subtotal_kobo: number;
  delivery_fee_kobo: number;
  total_kobo: number;
  delivery_address: string | null;
  status: FoodOrderStatus;
  paystack_reference: string | null;
  notes: string | null;
  created_at: string;
}
