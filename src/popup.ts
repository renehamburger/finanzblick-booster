import $ from 'cash-dom';
import { Action } from './lib/actions.class';
import { PREFIX } from './shared/const';

function triggerAction(action: Action) {
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    chrome.tabs.sendMessage(activeTabs[0].id, { action: `${PREFIX}${action}` });
  });
}

$('#deselectBookings').on('click', () => triggerAction('deselectBookings'));
$('#exportCurrentList').on('click', () => triggerAction('exportCurrentList'));
