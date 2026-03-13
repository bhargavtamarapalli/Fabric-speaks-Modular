"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.maskEmail = exports.maskMobile = void 0;
const pino_1 = __importDefault(require("pino"));
// Apply basic masking so logs don't reveal sensitive PII (Rule 5)
const maskMobile = (mobile) => {
    if (!mobile || mobile.length < 4)
        return 'MASKED';
    return '*'.repeat(mobile.length - 4) + mobile.slice(-4);
};
exports.maskMobile = maskMobile;
const maskEmail = (email) => {
    if (!email || !email.includes('@'))
        return 'MASKED';
    const parts = email.split('@');
    const local = parts[0];
    const domain = parts[1];
    if (!local || !domain)
        return 'MASKED';
    if (local.length <= 2)
        return `*@${domain}`;
    return `${local.slice(0, 1)}*${local.slice(-1)}@${domain}`;
};
exports.maskEmail = maskEmail;
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    // Optionally redact specific paths if passing full objects
    // redact: ['req.headers.authorization', 'req.body.password', 'res.headers["set-cookie"]']
});
