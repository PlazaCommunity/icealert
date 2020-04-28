import 'dotenv/config.js';
import moment from 'moment-timezone';
import low from 'lowdb';
import FileAsync from 'lowdb/adapters/FileAsync.js';

import zeno from './zeno/index.js';
import telegram from './telegram/index.js';
import logger from './logger/index.js';

const ADMIN = process.env.TELEGRAM_ADMIN_ID;
const GROUP =
  process.env.NODE_ENV === 'production'
    ? process.env.TELEGRAM_GROUP_ID_PRD
    : process.env.TELEGRAM_GROUP_ID_DEV;

const TAG = '[MAIN]';

(async () => {
  const adapter = new FileAsync('data.json');
  const db = await low(adapter);

  db.defaults({
    zeno: undefined,
  }).write();

  const state = {
    jobs: {
      zeno: {
        operational: true,
        error: undefined,
        lastExecution: undefined,
      },
    },
  };

  const bot = await telegram.initialize(state);
  logger.initialize(async (message) => {
    if (process.env.NODE_ENV === 'production') {
      return bot.telegram.sendMessage(
        ADMIN,
        `\`${message}\``,
        telegram.Extra.markdown()
      );
    }
    const duration = Date.now();
    let milliseconds = parseInt((duration % 1000) / 100),
      seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60),
      hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    const timestamp = `[${hours}:${minutes}:${seconds}:${milliseconds}00]`;
    return console.debug(`${timestamp} ${message}`);
  });

  await console.info(TAG, 'Bot now is online');
  await console.info(TAG, `ENV=${process.env.NODE_ENV}`);
  await console.info(TAG, `ENV.ADMIN=${ADMIN}`);
  await console.info(TAG, `ENV.GROUP=${GROUP}`);

  zeno.schedule(state, async (result) => {
    if (!result) {
      const message = `⛔️ *ERROR*: job _ZENO_ failed to update! Check status for more info.`;
      bot.telegram.sendMessage(ADMIN, message, telegram.Extra.markdown());
      return;
    }

    const old = await db.get('zeno').value();
    if (!old) {
      db.set('zeno', result).write();
      const message = `✳️ *INFO*: job _ZENO_ was never initialized. First run will not notify changes.`;
      bot.telegram.sendMessage(ADMIN, message, telegram.Extra.markdown());
      return;
    }

    // Check if the professor went live
    if (old.live.isLive != result.live.isLive) {
      if (result.live.isLive) {
        const message = '🅾️ Zeno è ora *in live*.';
        const keyboard = telegram.Markup.inlineKeyboard([
          telegram.Markup.urlButton(
            '👀 Guarda ora!',
            'https://zenogaburro.com/mod/bigbluebuttonbn/view.php?id=130'
          ),
        ]);
        bot.telegram.sendMessage(
          GROUP,
          message,
          telegram.Extra.markdown().markup(keyboard)
        );
      } else {
        const message = '🅾️ Zeno ha *terminato la sua live*.';
        bot.telegram.sendMessage(GROUP, message, telegram.Extra.markdown());
      }
    }

    const activityString = (activity) => {
      let message = `*${activity.name}*`;
      if (activity.type) {
        message += ` (${activity.type})`;
      }
      if (activity.link) {
        message += ` [Link 🔗](${activity.link})`;
      }
      return message;
    };

    const timerString = (timer) => {
      let message = `*${timer.name}*\n`;
      const now = moment();
      const deadline = moment(timer.date);
      const countdown = moment.duration(deadline - now);
      message += `📅 ${deadline.tz('Europe/Paris').locale('it').format('LLLL')}\n`
      message += 'tra '
      if (countdown.days()) {
        message += `${countdown.days()} giorni, `;
      }
      if (countdown.hours()) {
        message += `${countdown.hours()} ore, `;
      }
      if (countdown.minutes()) {
        message += `${countdown.minutes()} minuti, `;
      }
      message += `${countdown.seconds()} secondi\n`;
      return message;
    };

    // Limit changes messages to an arbitrary constant
    // so telegram api does not yell back at us
    let changes = 0;
    const MAX_CHANGES = 5;

    // Check for new or modified activities
    result.home.forEach((element) => {
      const record = old.home.find(
        (activity) => activity.label === element.label
      );
      const keyboard = telegram.Markup.inlineKeyboard([
        telegram.Markup.urlButton('👀 Guarda ora!', element.url),
      ]);

      if (changes < MAX_CHANGES) {
        if (!record) {
          let message = `➕ Zeno ha aggiunto la sezione *${element.label}*\n`;
          Object.keys(element.activities).forEach((hash) => {
            const activity = element.activities[hash];
            message += '\n• nuovo: ' + activityString(activity);
          });
          Object.keys(element.timers).forEach((hash) => {
            const timer = element.timers[hash];
            message += '\n\n⏰ *Nuovo Timer*:\n' + timerString(timer);
          });
          bot.telegram.sendMessage(
            GROUP,
            message,
            telegram.Extra.markdown().markup(keyboard)
          );
        } else if (element.hash !== record.hash) {
          let message = `➕ Zeno ha aggiornato la sezione *${element.label}*\n`;
          Object.keys(element.activities).forEach((hash) => {
            if (!record.activities[hash]) {
              const activity = element.activities[hash];
              message += '\n• nuovo: ' + activityString(activity);
            }
          });
          Object.keys(element.timers).forEach((hash) => {
            if (!record.timers[hash]) {
              const timer = element.timers[hash];
              message += '\n\n⏰ *Nuovo Timer*:\n' + timerString(timer);
            }
          });
          bot.telegram.sendMessage(
            GROUP,
            message,
            telegram.Extra.markdown().markup(keyboard)
          );
          changes++;
        }
      }
    });

    db.set('zeno', result).write();
  });
})();
