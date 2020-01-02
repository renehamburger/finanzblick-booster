import $ from 'cash-dom';
import { Action } from './lib/actions.class';

function triggerAction(action: Action) {
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    chrome.tabs.sendMessage(activeTabs[0].id, { action });
  });
}

$('#deselectBookings').on('click', () => triggerAction('deselectBookings'));
