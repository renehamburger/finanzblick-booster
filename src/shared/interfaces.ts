export interface XHRRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  payload?: string;
}

export interface XHRResponse {
  headers: string;
  body: string;
}
