import { PREFIX } from './shared/const';
import { XHRRequest, XHRResponse } from './shared/interfaces';

interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  pbb: {
    request: XHRRequest
  }
}

const XHR = XMLHttpRequest.prototype;
const xhrOpen = XHR.open;
const xhrSend = XHR.send;
const xhrSetRequestHeader = XHR.setRequestHeader;

const ROOT = '/webapp';
const WATCHED_ROUTES = ['Finance/GetBookings'];

function isWatchedRoute(url: string): boolean {
  return WATCHED_ROUTES.some((route) => url === `${ROOT}/${route}`);
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

XHR.setRequestHeader = function setRequestHeader(this: ExtendedXMLHttpRequest, header: string,
  value: string) {
  this.pbb.request.headers[header] = value;
  return xhrSetRequestHeader.call(this, header, value);
};

XHR.send = function send(this: ExtendedXMLHttpRequest, body) {
  const { request } = this.pbb;
  if (request && typeof body === 'string' && isWatchedRoute(request.url)) {
    try {
      const payload = JSON.parse(body);
      request.payload = payload;
      this.addEventListener('load', function onLoad() {
        const response: XHRResponse = {
          headers: this.getAllResponseHeaders(),
          body: JSON.parse(this.responseText)
        };
        window.postMessage({
          action: `${PREFIX}handleXHR`,
          arguments: [request, response]
        }, '*');
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }
  return xhrSend.call(this, body);
};
