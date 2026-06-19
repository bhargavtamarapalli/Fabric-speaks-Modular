/**
 * Shared validation utilities for config page sections
 */

export const normalizePhone = (value: string) => value.replace(/\D/g, '');

export const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isValidPhone = (value: string) => {
  const digits = normalizePhone(value);
  if (digits.length === 10) return true;
  if (digits.length === 12 && digits.startsWith('91')) return true;
  return false;
};

export type IdentityForm = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  gstNumber: string;
};

export const validateIdentity = (identity: IdentityForm) => {
  const next: Partial<Record<keyof IdentityForm, string>> = {};
  if (!identity.storeName.trim()) next.storeName = 'Store name is required';
  if (identity.storeEmail && !isValidEmail(identity.storeEmail)) {
    next.storeEmail = 'Enter a valid email address';
  }
  if (identity.storePhone && !isValidPhone(identity.storePhone)) {
    next.storePhone = 'Enter a valid phone number';
  }
  if (identity.gstNumber && identity.gstNumber.length < 15) {
    next.gstNumber = 'GST number must be at least 15 characters';
  }
  if (identity.gstNumber && identity.gstNumber.length > 15) {
    next.gstNumber = 'GST number cannot exceed 15 characters';
  }
  return next;
};

export type ShippingForm = {
  freeShippingAbove: number;
  codEnabled: boolean;
};

export const validateShipping = (shipping: ShippingForm) => {
  const next: Partial<Record<keyof ShippingForm, string>> = {};
  if (Number.isNaN(shipping.freeShippingAbove) || shipping.freeShippingAbove < 0) {
    next.freeShippingAbove = 'Free shipping above must be a non-negative number';
  }
  return next;
};

export type AlertsForm = {
  stockAlertThreshold: number;
};

export const validateAlerts = (alerts: AlertsForm) => {
  const next: Partial<Record<keyof AlertsForm, string>> = {};
  if (Number.isNaN(alerts.stockAlertThreshold) || alerts.stockAlertThreshold <= 0) {
    next.stockAlertThreshold = 'Stock alert threshold must be a positive number';
  }
  return next;
};

export type NotificationsForm = {
  adminWhatsapp: string;
  inventoryManagerWhatsapp: string;
  preferences: Record<string, boolean>;
};

export const validateNotifications = (notifs: NotificationsForm) => {
  const next: Partial<Record<keyof NotificationsForm, string>> = {};
  if (notifs.adminWhatsapp && !isValidPhone(notifs.adminWhatsapp)) {
    next.adminWhatsapp = 'Enter a valid phone number';
  }
  if (notifs.inventoryManagerWhatsapp && !isValidPhone(notifs.inventoryManagerWhatsapp)) {
    next.inventoryManagerWhatsapp = 'Enter a valid phone number';
  }
  return next;
};
