/**
 * API binding selection.
 *
 * The whole application imports `api` from here and never reaches for a
 * concrete implementation. To move onto a real backend, implement
 * {@link CodeDeskApi} with `fetch` against the endpoints in
 * `docs/api-contract.md` and switch the export below — no UI code changes.
 */

import type { CodeDeskApi } from './contract';
import { mockApi } from './mock/mock-api';

/** Set `VITE_API_BASE_URL` to point the client at a live backend. */
const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL as string | undefined;

export const USING_MOCK_API = !apiBaseUrl;

if (USING_MOCK_API && import.meta.env?.DEV) {
  console.info(
    '[codedesk] Using the in-memory mock API. Set VITE_API_BASE_URL to target a real backend.',
  );
}

export const api: CodeDeskApi = mockApi;

export { ApiError } from './contract';
export type { CodeDeskApi } from './contract';
