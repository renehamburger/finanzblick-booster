import { PREFIX } from './shared/const';

interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  pbb: {
    request: {
      method: string;
      url: string;
      headers: Record<string, string>,
      payload?: object
    }
  }
}

const XHR = XMLHttpRequest.prototype;
const xhrOpen = XHR.open;
const xhrSend = XHR.send;
const xhrSetRequestHeader = XHR.setRequestHeader;

const ROOT = 'https://finanzblick.de/webapp';
const WATCHED_ROUTES = []; // ['Finance/GetBookings'];

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
        const response = {
          headers: this.getAllResponseHeaders(),
          body: JSON.parse(this.responseText)
        };
        const event = new CustomEvent(`${PREFIX}xhr`, {
          detail: { request, response }
        });
        window.dispatchEvent(event);
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }
  return xhrSend.call(this, body);
};
