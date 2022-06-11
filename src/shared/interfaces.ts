export interface XHRRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  payload?: string | null;
}

export interface XHRResponse {
  headers: string;
  body: string;
}

export type ExportValue = string | number | boolean | Date;
export type BackendTransfer = Record<string, null | boolean | string | string[] | number>;
export type Transfer = Record<string, ExportValue>;
