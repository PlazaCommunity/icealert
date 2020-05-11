import low from 'lowdb';
import path from 'path';
import FileAsync from 'lowdb/adapters/FileAsync.js';

import config from './config/index.js';
import notify from './notify/index.js';
import logger from './logger/index.js';

import dol from './jobs/dol/index.js';
import zeno from './jobs/zeno/index.js';

const TAG = '[MAIN]';

(async () => {
  const adapter = new FileAsync(path.join(config.STORAGE, 'data.json'));
  const db = await low(adapter);

  db.defaults({
    bot: {
      webhooks: [],
    },
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
        lastExecution: undefined,
      },
    },
  };
  
  const notificator = await notify.initialize(db, state);
  logger.initialize(async (message) => {
    if (config.ENV === 'production') {
      return notificator.telegram.sendToAdmin(`\`${message}\``);
    }
    return console.debug(`${logger.timestamp()} ${message}`);
  });

  await console.info(TAG, 'Bot now is online');
  await console.info(TAG, `ENV=${config.ENV}`);
  await console.info(TAG, `ENV.ADMIN=${config.ADMIN}`);
  await console.info(TAG, `ENV.GROUP=${config.GROUP}`);

  zeno.schedule(state, zeno.alert(notificator, db));
  dol.schedule(state, dol.alert(notificator, db));
})();
