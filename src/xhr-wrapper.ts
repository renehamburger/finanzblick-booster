const XHR = XMLHttpRequest.prototype;
const xhrOpen = XHR.open;
const xhrSend = XHR.send;
const xhrSetRequestHeader = XHR.setRequestHeader;

XHR.open = function (method: string, url: string) {
  this._method = method;
  this._url = url;
  this._requestHeaders = {};
  return xhrOpen.apply(this, arguments);
};

XHR.setRequestHeader = function (header: string, value: string) {
  this._requestHeaders[header] = value;
  return xhrSetRequestHeader.apply(this, arguments);
};

XHR.send = function (postData) {
  this.addEventListener('load', function () {
    if (this._url) {
      if (postData) {
        if (typeof postData === 'string') {
          try {
            // here you get the REQUEST HEADERS, in JSON format, so you can also use JSON.parse
            this._requestHeaders = postData;
          } catch (err) {
            console.log('Request Header JSON decode failed, transfer_encoding field could be base64');
            console.log(err);
          }
        }
      }

      // here you get the RESPONSE HEADERS
      var responseHeaders = this.getAllResponseHeaders();

      if (this.responseType != 'blob' && this.responseText) {
        // responseText is string or null
        try {

          // here you get RESPONSE TEXT (BODY), in JSON format, so you can use JSON.parse
          var arr = this.responseText;

          // printing url, request headers, response headers, response body, to console

          console.log(this._url);
          console.log(JSON.parse(this._requestHeaders));
          console.log(responseHeaders);
          console.log(JSON.parse(arr));

        } catch (err) {
          console.log("Error in responseType try catch");
          console.log(err);
        }
      }

    }
  });
  return xhrSend.apply(this, arguments);
};
