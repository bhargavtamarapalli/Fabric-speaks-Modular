"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["OTP_RATE_LIMIT_MOBILE"] = "OTP_RATE_LIMIT_MOBILE";
    ErrorCode["OTP_RATE_LIMIT_IP"] = "OTP_RATE_LIMIT_IP";
    ErrorCode["OTP_INVALID"] = "OTP_INVALID";
    ErrorCode["OTP_EXPIRED"] = "OTP_EXPIRED";
    ErrorCode["JWT_INVALID"] = "JWT_INVALID";
    ErrorCode["JWT_EXPIRED"] = "JWT_EXPIRED";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["INSUFFICIENT_ROLE"] = "INSUFFICIENT_ROLE";
    ErrorCode["ACCOUNT_DELETED"] = "ACCOUNT_DELETED";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["PRODUCT_NOT_FOUND"] = "PRODUCT_NOT_FOUND";
    ErrorCode["ORDER_NOT_FOUND"] = "ORDER_NOT_FOUND";
    ErrorCode["VARIANT_NOT_FOUND"] = "VARIANT_NOT_FOUND";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_PINCODE"] = "INVALID_PINCODE";
    ErrorCode["PINCODE_NOT_SERVICEABLE"] = "PINCODE_NOT_SERVICEABLE";
    ErrorCode["STOCK_UNAVAILABLE"] = "STOCK_UNAVAILABLE";
    ErrorCode["COUPON_EXPIRED"] = "COUPON_EXPIRED";
    ErrorCode["COUPON_USED"] = "COUPON_USED";
    ErrorCode["COUPON_NOT_FOUND"] = "COUPON_NOT_FOUND";
    ErrorCode["COUPON_MIN_ORDER"] = "COUPON_MIN_ORDER";
    ErrorCode["COUPON_LIMIT_REACHED"] = "COUPON_LIMIT_REACHED";
    ErrorCode["ORDER_CANCEL_WINDOW_EXPIRED"] = "ORDER_CANCEL_WINDOW_EXPIRED";
    ErrorCode["ORDER_NOT_CANCELLABLE"] = "ORDER_NOT_CANCELLABLE";
    ErrorCode["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    ErrorCode["PAYMENT_ALREADY_PROCESSED"] = "PAYMENT_ALREADY_PROCESSED";
    ErrorCode["RETURN_NOT_ELIGIBLE"] = "RETURN_NOT_ELIGIBLE";
    ErrorCode["RETURN_ALREADY_EXISTS"] = "RETURN_ALREADY_EXISTS";
    ErrorCode["PRODUCT_HAS_PENDING_ORDERS"] = "PRODUCT_HAS_PENDING_ORDERS";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["WA_WINDOW_CLOSED"] = "WA_WINDOW_CLOSED";
    ErrorCode["BULK_UPLOAD_LIMIT"] = "BULK_UPLOAD_LIMIT";
    ErrorCode["INVALID_CSV"] = "INVALID_CSV";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class AppError extends Error {
    code;
    meta;
    statusCode;
    constructor(code, message, meta) {
        super(message || code);
        this.name = 'AppError';
        this.code = code;
        this.meta = meta;
        this.statusCode = AppError.getStatusCode(code);
    }
    static getStatusCode(code) {
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
exports.AppError = AppError;
