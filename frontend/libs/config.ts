// Nestar used REACT_APP_API_URL mapped in next.config.js.
// In Next.js only NEXT_PUBLIC_* variables reach the browser, so no mapping is needed.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
export const API_GRAPHQL_URL = `${API_URL}/graphql`;
