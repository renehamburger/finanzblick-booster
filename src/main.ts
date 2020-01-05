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
function onMessage(message) {
  if (message.action && message.action.startsWith(PREFIX)) {
    const action = message.action.replace(PREFIX, '');
    if (action in actions) {
      actions[action](...(message.arguments || []));
    }
  }
}

loadXhrWrapper();
chrome.runtime.onMessage.addListener(onMessage);
window.addEventListener('message', (evt) => onMessage(evt.data));
