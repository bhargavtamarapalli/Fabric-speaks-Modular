export type Role = 'customer' | 'supportAgent' | 'inventoryManager' | 'superAdmin';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RTO = 'RTO',
}

export enum ReturnStatus {
  INITIATED = 'INITIATED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RECEIVED = 'RECEIVED',
  REFUNDED = 'REFUNDED',
}

export interface JwtPayload {
  userId: string;
  role: Role;
  mobile?: string;
  sessionVersion?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
    meta?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Domain Entities
export interface Brand {
  id: string;
  name: string;
  slug: string;
  story?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Product {
  id: string;
  brandId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  fabricType: string;
  gsmWeight: number;
  weaveType: string;
  breathabilityRating: string;
  careInstructions: string;
  fabricOrigin: string;
  attributes: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Variant {
  id: string;
  productId: string;
  sku: string;
  size?: string;
  colour?: string;
  sizeLabel?: string;
  basePrice: number;
  priceOverride?: number;
  salePrice?: number;
  saleActive: boolean;
  qty: number;
  badges?: Record<string, unknown>;
  images?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface CreateVariantDto {
  sku: string;
  size?: string;
  colour?: string;
  sizeLabel?: string;
  basePrice: number;
  priceOverride?: number;
  salePrice?: number;
  saleActive?: boolean;
  qty: number;
  badges?: Record<string, unknown>;
  images?: Array<string | Record<string, unknown>>;
  isActive?: boolean;
}

export interface UpdateVariantDto {
  sizeLabel?: string;
  basePrice?: number;
  priceOverride?: number;
  salePrice?: number;
  saleActive?: boolean;
  qty?: number;
  badges?: Record<string, unknown>;
  images?: Array<string | Record<string, unknown>>;
  isActive?: boolean;
}

export interface BulkVariantUpdateDto {
  variantId: string;
  size?: string;
  colour?: string;
  sizeLabel?: string;
  basePrice?: number;
  priceOverride?: number;
  salePrice?: number;
  saleActive?: boolean;
  qty?: number;
  badges?: Record<string, unknown>;
  images?: Array<string | Record<string, unknown>>;
  isActive?: boolean;
}

export interface EnhancedProduct extends Product {
  variants: Array<Variant & { effectivePrice: number }>;
  brandName?: string;
  categoryName?: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

// DTOs
export interface ProductQueryDto {
  page: number;
  limit: number;
  search?: string;
  fabric?: string;
  brand?: string;
  size?: string;
  colour?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateProductDto {
  name: string;
  slug: string;
  brandId: string;
  categoryId: string;
  description?: string;
  fabricDetails?: string;
  careGuide?: string;
  fabricType: string;
  gsmWeight: number;
  weaveType: string;
  breathabilityRating: string;
  careInstructions: string;
  fabricOrigin: string;
  attributes?: Record<string, unknown>;
  variants: CreateVariantDto[];
}

export interface UpdateProductDto extends Partial<Omit<CreateProductDto, 'variants'>> {}

// Repository Interfaces
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findAll(filters: ProductQueryDto): Promise<{ items: Product[]; total: number }>;
  findAllAdmin(filters: any): Promise<{ items: Product[]; total: number }>;
  create(dto: any): Promise<Product>; // dto will be mapped to snake_case
  update(id: string, dto: any): Promise<Product>;
  softDelete(id: string): Promise<void>;
}

export interface IVariantRepository {
  findById(id: string): Promise<Variant | null>;
  findByProductId(productId: string): Promise<Variant[]>;
  findBySku(sku: string): Promise<Variant | null>;
  updateStock(id: string, qty: number): Promise<void>;
  create(dto: CreateVariantDto & { productId: string }, client?: DbClient): Promise<Variant>;
  bulkCreate(productId: string, variants: CreateVariantDto[], client?: DbClient): Promise<Variant[]>;
  verifyBelongToProduct(variantIds: string[], productId: string, client?: DbClient): Promise<boolean>;
  bulkUpdate(updates: BulkVariantUpdateDto[], client?: DbClient): Promise<Variant[]>;
  updateById(id: string, dto: UpdateVariantDto, client?: DbClient): Promise<Variant>;
  deactivate(id: string, client?: DbClient): Promise<Variant>;
}

export interface IBrandRepository {
  findAllActive(): Promise<Brand[]>;
  findAll(includeInactive?: boolean): Promise<Brand[]>;
  findById(id: string): Promise<Brand | null>;
  create(dto: any): Promise<Brand>;
  update(id: string, dto: any): Promise<Brand>;
}

export interface ICategoryRepository {
  findAllActive(): Promise<Category[]>;
  findAll(includeInactive?: boolean): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  create(dto: any): Promise<Category>;
  update(id: string, dto: any): Promise<Category>;
}

export interface ICollectionRepository {
  findAllActive(): Promise<Collection[]>;
  findAll(includeInactive?: boolean): Promise<Collection[]>;
  findBySlug(slug: string): Promise<Collection | null>;
  findById(id: string): Promise<Collection | null>;
  findProductsByCollectionId(collectionId: string): Promise<string[]>;
  create(dto: any): Promise<Collection>;
  update(id: string, dto: any): Promise<Collection>;
  addProducts(collectionId: string, productIds: string[]): Promise<void>;
  removeProduct(collectionId: string, productId: string): Promise<void>;
  reorderProducts(collectionId: string, productIds: string[]): Promise<void>;
}

// Database Utility Types
import { PoolClient } from 'pg';
export type DbClient = PoolClient;
