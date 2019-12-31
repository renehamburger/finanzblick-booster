loadXhrWrapper();

function loadXhrWrapper() {
  const s = document.createElement('script');
  s.src = chrome.extension.getURL('js/xhr-wrapper.js');
  s.addEventListener('load', function () {
    this.remove();
  });
  (document.head || document.documentElement).appendChild(s);
}
