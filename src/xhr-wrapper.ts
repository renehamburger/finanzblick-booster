import { PREFIX, FB_API_BASE_URL } from './shared/const';
import { XHRRequest, XHRResponse } from './shared/interfaces';

interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  pbb: {
    request: XHRRequest;
  };
}

const XHR = XMLHttpRequest.prototype;
const xhrOpen = XHR.open;
const xhrSend = XHR.send;
const xhrSetRequestHeader = XHR.setRequestHeader;

function isWatchedRoute(url: string): boolean {
  return url.startsWith(FB_API_BASE_URL);
}

XHR.open = function open(this: ExtendedXMLHttpRequest, method: string, url: string) {
  this.pbb = {
    request: {
      method,
      url,
      headers: {}
    }
  };
  return xhrOpen.call(this, method, url);
};

XHR.setRequestHeader = function setRequestHeader(
  this: ExtendedXMLHttpRequest,
  header: string,
  value: string
) {
  this.pbb.request.headers[header] = value;
  return xhrSetRequestHeader.call(this, header, value);
};

XHR.send = function send(this: ExtendedXMLHttpRequest, payload) {
  const { request } = this.pbb;
  if (request && (payload === null || typeof payload === 'string') && isWatchedRoute(request.url)) {
    try {
      request.payload = payload as any;
      this.addEventListener('load', function onLoad() {
        const response: XHRResponse = {
          headers: this.getAllResponseHeaders(),
          body: this.responseText
        };
        window.postMessage(
          {
            action: `${PREFIX}handleXHR`,
            arguments: [request, response]
          },
          '*'
        );
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }
  return xhrSend.call(this, payload);
};
