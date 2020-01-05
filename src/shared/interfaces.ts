export interface XHRRequest {
  method: string;
  url: string;
  headers: Record<string, string>,
  payload?: object
}

export interface XHRResponse {
  headers: string;
  body: any;
}
