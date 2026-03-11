// Stub placeholder for Auth hook to satisfy Vitest resolution during component unit testing
// Actual implementation will likely be Next-Auth or custom JWT context
export const useAuth = () => {
  return { user: null, loading: false, logout: () => {} };
};
