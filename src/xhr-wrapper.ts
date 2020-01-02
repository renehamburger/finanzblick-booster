const XHR = XMLHttpRequest.prototype;
const xhrOpen = XHR.open;
const xhrSend = XHR.send;
const xhrSetRequestHeader = XHR.setRequestHeader;

const ROOT = 'https://finanzblick.de/webapp';
const WATCHED_ROUTES = []; // ['Finance/GetBookings'];

XHR.open = function (method: string, url: string) {
  if (WATCHED_ROUTES.some(route => url === `${ROOT}/${route}`)) {
    this._request = {
      method,
      url,
      headers: {}
    };
  }
  return xhrOpen.apply(this, arguments);
};

XHR.setRequestHeader = function (header: string, value: string) {
  if (this._request) {
    this._request.headers[header] = value;
  }
  return xhrSetRequestHeader.apply(this, arguments);
};

XHR.send = function (data) {
  const request = this._request;
  if (request) {
    request.data = data;
    this.addEventListener('load', function () {
      const response = {
        headers: this.getAllResponseHeaders(),
        body: JSON.parse(this.responseText)
      };
      const event = new CustomEvent('fb.xhr', {
        detail: { request, response }
      });
      window.dispatchEvent(event);
    });
  }
  return xhrSend.apply(this, arguments);
};
