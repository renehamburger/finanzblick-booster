import { Actions } from './lib/actions.class';

function loadXhrWrapper() {
  const s = document.createElement('script');
  s.src = chrome.extension.getURL('js/finanzblick-booster-xhr-wrapper.js');
  s.addEventListener('load', function onLoad() {
    this.remove();
  });
  (document.head || document.documentElement).appendChild(s);
}

const actions = new Actions();
loadXhrWrapper();

chrome.runtime.onMessage.addListener((request) => {
  if (request.action in actions) {
    actions[request.action]();
  }
});
