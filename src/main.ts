import { Actions } from './lib/actions.class';
import { PREFIX } from './shared/const';

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
  if (request.action && request.action.startsWith(PREFIX)) {
    const action = request.action.replace(PREFIX, '');
    if (action in actions) {
      actions[action]();
    }
  }
});
