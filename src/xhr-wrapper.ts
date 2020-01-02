const XHR = XMLHttpRequest.prototype;
const xhrOpen = XHR.open;
const xhrSend = XHR.send;
const xhrSetRequestHeader = XHR.setRequestHeader;

const ROOT = 'https://finanzblick.de/webapp';
const WATCHED_ROUTES = []; // ['Finance/GetBookings'];

XHR.open = function open(method: string, url: string) {
  if (WATCHED_ROUTES.some((route) => url === `${ROOT}/${route}`)) {
    this.pbbRequest = {
      method,
      url,
      headers: {}
    };
  }
  return xhrOpen.call(this, method, url);
};

XHR.setRequestHeader = function setRequestHeader(header: string, value: string) {
  if (this.pbbRequest) {
    this.pbbRequest.headers[header] = value;
  }
  return xhrSetRequestHeader.call(this, header, value);
};

XHR.send = function send(data) {
  const request = this.pbbRequest;
  if (request) {
    request.data = data;
    this.addEventListener('load', function onLoad() {
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
  return xhrSend.call(this, data);
};
