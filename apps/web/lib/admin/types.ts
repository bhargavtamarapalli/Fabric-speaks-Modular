// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Admin TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

// ─── Auth & Roles ─────────────────────────────────────────────────────────────

export type AdminRole = 'SUPER_ADMIN' | 'INVENTORY_MANAGER' | 'SUPPORT_AGENT';

export interface AdminUser {
  id:          string;
  name:        string;
  email:       string | null;
  mobile?:     string;
  role:        AdminRole;
  isActive:    boolean;
  lastActiveAt: string | null;
  createdAt:   string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  firebaseUid: string;
  role: string;
  createdAt: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_PICKED'
  | 'RETURN_RECEIVED'
  | 'REFUNDED';

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'COD';

export interface OrderItem {
  id:          string;
  productName: string;
  fabricType:  string;
  size:        string;
  colour:      string;
  sku:         string;
  qty:         number;
  unitPrice:   number;
}

export interface Order {
  id:              string;
  orderNumber:     string;
  userId:          string | null;
  guestMobile:     string | null;
  guestAddress:    Address | null;
  customer: {
    name:    string;
    mobile:  string;
    address: Address;
  };
  items:           OrderItem[];
  subtotal:        number;
  discount:        number;
  shipping:        number;
  total:           number;
  status:          OrderStatus;
  paymentMethod:   PaymentMethod;
  paymentStatus:   'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  awbNumber:       string | null;
  courierName:     string | null;
  shiprocketOrderId: string | null;
  trackingToken:   string | null;
  createdAt:       string;
  updatedAt:       string;
}

export interface OrderTimeline {
  status:    string;
  timestamp: string;
  actor:     'system' | 'admin' | 'courier' | 'customer';
  note:      string | null;
}

export interface PackingSlip {
  orderNumber:   string;
  orderDate:     string;
  customer: {
    name:    string;
    phone:   string;
    address: string;
  };
  items:         OrderItem[];
  totalItems:    number;
  paymentMethod: string;
  codAmount:     number | null;
}

// ─── Products & Catalog ───────────────────────────────────────────────────────

export interface Variant {
  id:             string;
  size:           string;
  colour:         string;
  sku:            string;
  price:          number;
  comparePrice:   number | null;
  stockQty:       number;
  colourImageUrl: string | null;
  version:        number;
}

export interface Product {
  id:                  string;
  name:                string;
  slug:                string;
  description:         string;
  brandId:             string;
  brandName:           string;
  categoryId:          string;
  categoryName:        string;
  fabricType:          string;
  gsmWeight:           number;
  weaveType:           string;
  breathabilityRating: string;
  careInstructions:    string;
  fabricOrigin:        string;
  isActive:            boolean;
  variants:            Variant[];
  images:              string[];
  createdAt:           string;
}

export interface Brand {
  id:       string;
  name:     string;
  slug:     string;
  logoUrl:  string | null;
  isActive: boolean;
}

export interface Category {
  id:       string;
  name:     string;
  slug:     string;
  parentId: string | null;
  isActive: boolean;
}

export interface Collection {
  id:          string;
  name:        string;
  slug:        string;
  description: string;
  imageUrl:    string | null;
  isActive:    boolean;
  productCount: number;
}

export interface VariantTemplate {
  id: string;
  name: string;
  sizes: string[];
  colours: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export type StockStatus = 'CRITICAL' | 'WARNING' | 'HEALTHY';

export interface InventoryItem {
  variantId:     string;
  productName:   string;
  fabricType:    string;
  size:          string;
  colour:        string;
  sku:           string;
  stockQty:      number;
  avgDailySales: number;
  daysRemaining: number | null;
  status:        StockStatus;
}

export interface StockHealth {
  critical: number;
  warning:  number;
  healthy:  number;
  total:    number;
  items:    InventoryItem[];
}

export interface InventoryAdjustment {
  id:          string;
  variantId:   string;
  productName: string;
  sku:         string;
  adjustment:  number;
  reason:      string;
  adminName:   string;
  createdAt:   string;
}

export type ExpectedStockStatus = 'ORDERED' | 'IN_TRANSIT' | 'RECEIVED';

export interface ExpectedStock {
  id:              string;
  variantId:       string;
  productName:     string;
  size:            string;
  colour:          string;
  sku:             string;
  supplierName:    string;
  qtyExpected:     number;
  expectedArrival: string;
  status:          ExpectedStockStatus;
  notes:           string | null;
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export type ReturnStatus =
  | 'RETURN_REQUESTED'
  | 'APPROVED'
  | 'PICKUP_SCHEDULED'
  | 'RETURN_PICKED'
  | 'RETURN_RECEIVED'
  | 'REFUND_INITIATED'
  | 'REFUNDED'
  | 'REPLACEMENT_SENT';

export type ReturnResolution = 'REFUND' | 'REPLACEMENT';

export interface Return {
  id:              string;
  orderId:         string;
  orderNumber:     string;
  customer: {
    name:   string;
    mobile: string;
  };
  product:         string;
  size:            string;
  colour:          string;
  reason:          string;
  status:          ReturnStatus;
  resolution:      ReturnResolution | null;
  pickupDate:      string | null;
  daysOpen:        number;
  replacementOrderId: string | null;
  replacementOrderNumber: string | null;
  createdAt:       string;
}

export interface ReturnTimeline {
  status:    string;
  timestamp: string;
  actor:     'customer' | 'admin' | 'courier' | 'system';
  note:      string | null;
}

export interface RefundStatus {
  razorpayRefundId:    string;
  amount:              number;
  status:              'pending' | 'processed' | 'failed';
  initiatedAt:         string;
  processedAt:         string | null;
  expectedCreditDays:  number;
  bankReferenceNumber: string | null;
}

// ─── Support ─────────────────────────────────────────────────────────────────

export type CasePriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CaseStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';

export interface SupportCase {
  id:        string;
  customer: {
    name:   string;
    mobile: string;
  };
  orderId:   string | null;
  orderNumber: string | null;
  issueType: string;
  priority:  CasePriority;
  status:    CaseStatus;
  assignedTo: string | null;
  createdAt: string;
  notes:     CaseNote[];
}

export interface CaseNote {
  id:        string;
  agentName: string;
  note:      string;
  createdAt: string;
}

export interface CustomerProfile {
  id:          string;
  name:        string;
  mobile:      string;
  email:       string | null;
  memberSince: string;
  totalOrders: number;
  totalSpent:  number;
  tags:        string[];
  orders:      Order[];
  returns:     Return[];
  messages:    WhatsAppLog[];
  notes:       CaseNote[];
}

export interface WhatsAppLog {
  templateName: string;
  sentAt:       string;
  status:       'DELIVERED' | 'READ' | 'FAILED';
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export type DiscountType = 'PERCENTAGE' | 'FLAT';

export interface Coupon {
  id:            string;
  code:          string;
  discountType:  DiscountType;
  discountValue: number;
  maxDiscount?:  number | null;
  minOrderValue: number;
  usageLimit:    number;
  usedCount:     number;
  perUserLimit:  number;
  expiresAt:     string;
  isActive:      boolean;
  createdAt:     string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface StoreSettings {
  storeName:               string;
  storeEmail:              string;
  storePhone:              string;
  gstNumber:               string;
  freeShippingAbove:       number;
  codEnabled:              boolean;
  stockAlertThreshold:     number;
  adminWhatsapp:           string;
  inventoryManagerWhatsapp: string;
  notificationPreferences: {
    newPaidOrders:  boolean;
    newCodOrders:   boolean;
    stockCritical:  boolean;
    stockLow:       boolean;
    returnRequests: boolean;
  };
  razorpayLiveMode: boolean;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id:          string;
  adminEmail:  string;
  action:      string;
  entity:      string;
  entityId:    string;
  detail:      string;
  ipAddress:   string;
  createdAt:   string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardData {
  revenueToday:       number;
  revenueDelta:       number;
  ordersToday:        number;
  ordersDelta:        number;
  lowStockCount:      number;
  openReturns:        number;
  awaitingShiprocket: number;
  codPending:         number;
  recentOrders:       Order[];
  stockHealth:        StockHealth;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data:    T;
  meta?:   Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code:    string;
    message: string;
    meta?:   Record<string, unknown>;
  };
}

export interface ApiErrorLegacy {
  success:   false;
  errorCode: string;
  message:   string;
  meta?:     Record<string, unknown>;
}

export type ApiError = ApiErrorEnvelope | ApiErrorLegacy;
export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Address ─────────────────────────────────────────────────────────────────

export interface Address {
  label:   string;
  line1:   string;
  line2:   string | null;
  city:    string;
  state:   string;
  pincode: string;
}

// ─── Content ─────────────────────────────────────────────────────────────────

export interface ContentPage {
  id:          string;
  slug:        string;
  title:       string;
  body:        string;
  metaTitle:   string;
  metaDesc:    string;
  publishedAt: string | null;
  updatedAt:   string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsData {
  revenueByDay:   { date: string; amount: number }[];
  ordersByDay:    { date: string; count: number }[];
  topProducts:    { name: string; fabricType: string; unitsSold: number; revenue: number; returnRate: number }[];
  topFabrics:     { fabricType: string; percentage: number }[];
  totalRevenue:   number;
  totalOrders:    number;
  avgOrderValue:  number;
  returnRate:     number;
}
