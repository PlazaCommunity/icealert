import Extra from 'telegraf/extra.js';
import Markup from 'telegraf/markup.js';

import telegram from './telegram.js';
import webhooks from './webhooks.js';

class Notificator {
  constructor(telegramService, webhooksService) {
    this.telegram = telegramService;
    this.webhooks = webhooksService;
  }
}

const initialize = async (db, state) => {
  const telegramService = await telegram.initialize(db, state);
  const webhooksService = await webhooks.initialize(db, state);
  return new Notificator(telegramService, webhooksService);
};

export default {
  initialize,
  Extra,
  Markup,
};
