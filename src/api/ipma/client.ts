const BASE_URL = 'https://api.ipma.pt/open-data';
const DEFAULT_TIMEOUT_MS = 8000;

export type IpmaErrorKind = 'network' | 'http' | 'payload';

export class IpmaError extends Error {
  readonly kind: IpmaErrorKind;
  readonly status?: number;

  constructor(message: string, kind: IpmaErrorKind, status?: number) {
    super(message);
    this.name = 'IpmaError';
    this.kind = kind;
    this.status = status;
  }
}

type RequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Fetches JSON from the IPMA open-data API with a timeout and normalized errors.
 * The API is public (no key) and sends `Access-Control-Allow-Origin: *`.
 */
export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new IpmaError(`IPMA responded with ${response.status}`, 'http', response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof IpmaError) {
      throw error;
    }

    if (signal?.aborted) {
      throw new IpmaError('Request cancelled', 'network');
    }

    const aborted = controller.signal.aborted;
    const message = error instanceof Error ? error.message : String(error);

    throw new IpmaError(
      aborted ? `IPMA request timed out after ${timeoutMs}ms` : message,
      'network'
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
