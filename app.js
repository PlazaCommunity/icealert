
import low from 'lowdb';
import path from 'path';
import FileAsync from 'lowdb/adapters/FileAsync.js';

import config from './config/index.js'
import telegram from './telegram/index.js';
import logger from './logger/index.js';

import dol from './dol/index.js';
import zeno from './zeno/index.js';

const TAG = '[MAIN]';

(async () => {
  const adapter = new FileAsync(path.join(config.STORAGE, 'data.json'));
  const db = await low(adapter);

  db.defaults({
    zeno: undefined,
    dol: undefined,
  }).write();

  const state = {
    jobs: {
      zeno: {
        operational: true,
        error: undefined,
        lastExecution: undefined,
      },
      dol: {
        operational: true,
        error: undefined,
        lastExecution: undefined
      }
    },
  };

  const bot = await telegram.initialize(state);
  logger.initialize(async (message) => {
    if (process.env.NODE_ENV === 'production') {
      return bot.telegram.sendMessage(
        config.ADMIN,
        `\`${message}\``,
        telegram.Extra.markdown()
      );
    }
    return console.debug(`${logger.timestamp()} ${message}`);
  });

  await console.info(TAG, 'Bot now is online');
  await console.info(TAG, `ENV=${process.env.NODE_ENV}`);
  await console.info(TAG, `ENV.ADMIN=${config.ADMIN}`);
  await console.info(TAG, `ENV.GROUP=${config.GROUP}`);

  zeno.schedule(state, zeno.notify(bot, db));
  dol.schedule(state, dol.notify(bot, db));
})();
