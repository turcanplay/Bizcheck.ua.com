/** Backend API base URL. Vite proxy in dev, nginx proxy in production. */
export const API_BASE = import.meta.env.VITE_API_URL || '/api_crowe_bizcheck';
