import { apiFetch } from '@/lib/apiClient';

export interface OtpSendResponse { message: string; }
export interface OtpVerifyResponse { token: string; userId: string; }

export async function sendOtp(mobile: string): Promise<OtpSendResponse> {
  return apiFetch<OtpSendResponse>('/auth/otp/send', { method: 'POST', data: { mobile } });
}

export async function verifyOtp(mobile: string, otp: string): Promise<OtpVerifyResponse> {
  return apiFetch<OtpVerifyResponse>('/auth/otp/verify', { method: 'POST', data: { mobile, otp } });
}
