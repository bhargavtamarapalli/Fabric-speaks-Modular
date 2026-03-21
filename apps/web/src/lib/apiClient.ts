import axios, { AxiosError } from "axios";

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://api.fabricspeaks.com/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
      config.headers["X-CSRF-Token"] = csrfMeta.getAttribute("content");
    } else {
      const match = document.cookie.match(new RegExp('(^| )csrfToken=([^;]+)'));
      if (match) {
        config.headers["X-CSRF-Token"] = match[2];
      }
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    const resData = response.data as ApiResponse;
    if (resData && typeof resData.success === 'boolean' && !resData.success) {
       throw new ApiError(resData.error?.code || 'UNKNOWN_ERROR', resData.error?.message || 'API request failed');
    }
    return resData.data; 
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // @ts-ignore
    if (error.response?.status === 401 && !originalRequest._retry) {
      // @ts-ignore
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest!);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        await apiClient.get("/auth/me");
        processQueue(null);
        return apiClient(originalRequest!);
      } catch (err) {
        processQueue(err, null);
        if (typeof window !== "undefined") {
           window.dispatchEvent(new Event("unauthorized"));
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.data) {
       const resData = error.response.data as ApiResponse;
       if (resData.error) {
         return Promise.reject(new ApiError(resData.error.code, resData.error.message));
       }
    }

    return Promise.reject(error);
  }
);

export const apiFetch = async <T>(path: string, options?: any): Promise<T> => {
  return apiClient.request<any, T>({
    url: path,
    ...options,
  });
};
