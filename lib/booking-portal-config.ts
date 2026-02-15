// Server-side config for booking portal URL
// Can be overridden by environment variable or client-side settings

export const getBookingPortalUrl = (): string => {
  // Check environment variable first
  if (process.env.BOOKING_PORTAL_URL) {
    return process.env.BOOKING_PORTAL_URL;
  }

  // Default fallback
  return "http://localhost:3000";
};

// Client-side hook to manage settings (to be used in browser)
export const useBookingPortalSettings = () => {
  if (typeof window === "undefined") return null;

  const STORAGE_KEY = "booking-portal-url";

  const getUrl = (): string => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored || "http://localhost:3000";
    } catch {
      return "http://localhost:3000";
    }
  };

  const setUrl = (url: string): void => {
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch (error) {
      console.error("Failed to save booking portal URL:", error);
    }
  };

  const resetUrl = (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to reset booking portal URL:", error);
    }
  };

  return { getUrl, setUrl, resetUrl };
};
