import axios from 'axios';

import config from '../config/index.js';

class WebhooksService {
  constructor(db, datapoint) {
    this.db = db;
    this.datapoint = datapoint;
  }

  async send(title, url, text) {
    const hooks = await this.db.get(this.datapoint).value();
    for (let i in hooks) {
      const hook = hooks[i];
      axios
        .post(hook.url, {
          username: config.BOT_NAME,
          avatar_url: config.BOT_IMAGE,
          embeds: [
            {
              title: title,
              url: url,
              description: text,
              color: 15258703,
              footer: {
                text: config.ENV,
                icon_url: config.AUTHOR_IMAGE,
              },
            },
          ],
        })
        .catch(() => {
          this.db
            .get('bot.webhooks')
            .remove({
              name: hook.name,
            })
            .write();
          console.warn(`Webhook <${hook.name}> was not found. Removed`);
        });
    }
  }
}

const initialize = async (db, _) => {
  return new WebhooksService(db, 'bot.webhooks');
};

export default {
  initialize,
};
