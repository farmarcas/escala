// Cliente HTTP da tela. Fala só com a própria origem: o Vite repassa /api para a API.
// Envia o papel de demonstração (x-demo-role e, para o grupo, x-demo-tenant), que a API
// só aceita no ambiente local.

export type DemoRole = 'admin' | 'analyst' | 'owner';

export type DemoIdentity =
  | { role: 'admin' | 'analyst' }
  | { role: 'owner'; tenantId: string; tenantName: string; tenantNumber: number };

export type FieldIssue = { path: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldIssue[];

  constructor(status: number, code: string, message: string, details: FieldIssue[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type Paginated<T> = { data: T[]; meta: { page: number; pageSize: number; total: number } };

let currentIdentity: DemoIdentity = { role: 'admin' };

export function setApiIdentity(identity: DemoIdentity) {
  currentIdentity = identity;
}

function identityHeaders(): Record<string, string> {
  return currentIdentity.role === 'owner'
    ? { 'x-demo-role': 'owner', 'x-demo-tenant': currentIdentity.tenantId }
    : { 'x-demo-role': currentIdentity.role };
}

function isErrorBody(body: unknown): body is {
  error: { code: string; message: string; details?: FieldIssue[] };
} {
  return typeof body === 'object' && body !== null && 'error' in body;
}

async function request<T>(
  base: string,
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
) {
  let response: Response;
  const isForm = body instanceof FormData;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal,
      headers: {
        ...identityHeaders(),
        ...(body === undefined || isForm ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível falar com o servidor.');
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isErrorBody(payload)) {
      const { code, message, details } = payload.error;
      throw new ApiError(response.status, code, message, details ?? []);
    }
    throw new ApiError(response.status, 'UNKNOWN', 'Algo deu errado. Tente de novo.');
  }
  return payload as T;
}

export type ApiClient = {
  base: string;
  get: <T>(path: string, signal?: AbortSignal) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
  patch: <T>(path: string, body: unknown) => Promise<T>;
  put: <T>(path: string, body: unknown) => Promise<T>;
  delete: (path: string) => Promise<void>;
  // Envio de arquivo (multipart). Os campos extras vão junto do arquivo.
  upload: <T>(path: string, file: File, fields: Record<string, string>) => Promise<T>;
};

function createApi(base: string): ApiClient {
  return {
    base,
    get: (path, signal) => request(base, 'GET', path, undefined, signal),
    post: (path, body) => request(base, 'POST', path, body),
    patch: (path, body) => request(base, 'PATCH', path, body),
    put: (path, body) => request(base, 'PUT', path, body),
    delete: (path) => request<void>(base, 'DELETE', path),
    upload: (path, file, fields) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.append(key, value);
      form.append('file', file);
      return request(base, 'POST', path, form);
    },
  };
}

// Caminho do operador Farmarcas e caminho do grupo: a API isola os dois.
export const api = createApi('/api/v1/backoffice');
export const tenantApi = createApi('/api/v1/tenant');
export const demoApi = createApi('/api/v1/demo');

export type Side = 'platform' | 'tenant';
export const apiFor = (side: Side): ApiClient => (side === 'tenant' ? tenantApi : api);

// Endereço para baixar um arquivo com o papel atual (o navegador não manda cabeçalho em link).
export async function downloadFile(client: ApiClient, path: string, fileName: string) {
  const response = await fetch(`${client.base}${path}`, { headers: identityHeaders() });
  if (!response.ok)
    throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'Não foi possível baixar o arquivo.');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError(0, 'UNKNOWN', 'Algo deu errado. Tente de novo.');
}

// Mensagem do campo vinda da validação da API (path "body.cnpj" → "cnpj").
export function fieldErrors(error: ApiError | null): Record<string, string> {
  if (!error) return {};
  // Detalhes que não são de campo (ex.: { existing } de nome repetido) ficam de fora.
  return Object.fromEntries(
    error.details
      .filter((issue) => typeof issue.path === 'string')
      .map((issue) => [issue.path.replace(/^body\./, ''), issue.message]),
  );
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
