export enum ErrorCode {
  OTP_RATE_LIMIT_MOBILE = 'OTP_RATE_LIMIT_MOBILE',
  OTP_RATE_LIMIT_IP = 'OTP_RATE_LIMIT_IP',
  OTP_INVALID = 'OTP_INVALID',
  OTP_EXPIRED = 'OTP_EXPIRED',
  JWT_INVALID = 'JWT_INVALID',
  JWT_EXPIRED = 'JWT_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  NOT_FOUND = 'NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  VARIANT_NOT_FOUND = 'VARIANT_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PINCODE = 'INVALID_PINCODE',
  PINCODE_NOT_SERVICEABLE = 'PINCODE_NOT_SERVICEABLE',
  STOCK_UNAVAILABLE = 'STOCK_UNAVAILABLE',
  COUPON_EXPIRED = 'COUPON_EXPIRED',
  COUPON_USED = 'COUPON_USED',
  COUPON_NOT_FOUND = 'COUPON_NOT_FOUND',
  COUPON_MIN_ORDER = 'COUPON_MIN_ORDER',
  COUPON_LIMIT_REACHED = 'COUPON_LIMIT_REACHED',
  ORDER_CANCEL_WINDOW_EXPIRED = 'ORDER_CANCEL_WINDOW_EXPIRED',
  ORDER_NOT_CANCELLABLE = 'ORDER_NOT_CANCELLABLE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  RETURN_NOT_ELIGIBLE = 'RETURN_NOT_ELIGIBLE',
  RETURN_ALREADY_EXISTS = 'RETURN_ALREADY_EXISTS',
  PRODUCT_HAS_PENDING_ORDERS = 'PRODUCT_HAS_PENDING_ORDERS',
  DUPLICATE_SKU = 'DUPLICATE_SKU',
  SKU_ALREADY_EXISTS = 'SKU_ALREADY_EXISTS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  WA_WINDOW_CLOSED = 'WA_WINDOW_CLOSED',
  BULK_UPLOAD_LIMIT = 'BULK_UPLOAD_LIMIT',
  INVALID_CSV = 'INVALID_CSV',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

export class AppError extends Error {
  public code: ErrorCode;
  public meta?: Record<string, unknown>;
  public statusCode: number;
  public isOperational: boolean = true;  // true = operational error; false = programmer error

  constructor(code: ErrorCode, message?: string, meta?: Record<string, unknown>) {
    super(message || code);
    this.name = 'AppError';
    this.code = code;
    this.meta = meta;
    this.statusCode = AppError.getStatusCode(code);
  }

  private static getStatusCode(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_PINCODE:
      case ErrorCode.PINCODE_NOT_SERVICEABLE:
      case ErrorCode.COUPON_EXPIRED:
      case ErrorCode.COUPON_USED:
      case ErrorCode.COUPON_NOT_FOUND:
      case ErrorCode.COUPON_MIN_ORDER:
      case ErrorCode.COUPON_LIMIT_REACHED:
      case ErrorCode.ORDER_CANCEL_WINDOW_EXPIRED:
      case ErrorCode.ORDER_NOT_CANCELLABLE:
      case ErrorCode.RETURN_NOT_ELIGIBLE:
      case ErrorCode.INVALID_CSV:
      case ErrorCode.BULK_UPLOAD_LIMIT:
      case ErrorCode.DUPLICATE_SKU:
      case ErrorCode.SKU_ALREADY_EXISTS:
        return 400;
      case ErrorCode.OTP_INVALID:
      case ErrorCode.OTP_EXPIRED:
      case ErrorCode.JWT_INVALID:
      case ErrorCode.JWT_EXPIRED:
      case ErrorCode.UNAUTHORIZED:
        return 401;
      case ErrorCode.PAYMENT_FAILED:
        return 402;
      case ErrorCode.INSUFFICIENT_ROLE:
      case ErrorCode.ACCOUNT_DELETED:
      case ErrorCode.WA_WINDOW_CLOSED:
        return 403;
      case ErrorCode.NOT_FOUND:
      case ErrorCode.PRODUCT_NOT_FOUND:
      case ErrorCode.ORDER_NOT_FOUND:
      case ErrorCode.VARIANT_NOT_FOUND:
        return 404;
      case ErrorCode.STOCK_UNAVAILABLE:
      case ErrorCode.PAYMENT_ALREADY_PROCESSED:
      case ErrorCode.RETURN_ALREADY_EXISTS:
      case ErrorCode.PRODUCT_HAS_PENDING_ORDERS:
        return 409;
      case ErrorCode.OTP_RATE_LIMIT_MOBILE:
      case ErrorCode.OTP_RATE_LIMIT_IP:
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429;
      case ErrorCode.EXTERNAL_SERVICE_ERROR:
        return 502;
      case ErrorCode.INTERNAL_ERROR:
      default:
        return 500;
    }
  }
}
