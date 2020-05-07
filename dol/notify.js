import axios from 'axios'

import telegram from '../telegram/index.js';
import config from '../config/index.js';

const TAG = '[DOL]';

const COURSE_EMOJI = {
  'Analisi matematica 2': '🧮',
  'Programmazione 2': '💻',
  'Calcolo delle probabilità': '📊',
};

const notify = (bot, db) => async (result) => {
  if (!result) {
    const message = `⛔️ *ERROR*: job _DOL_ failed to update! Check status for more info.`;
    bot.telegram.sendMessage(config.ADMIN, message, telegram.Extra.markdown());
    return;
  }

  const old = await db.get('dol').value();
  if (!old) {
    db.set('dol', result).write();
    const message = `✳️ *INFO*: job _DOL_ was never initialized. First run will not notify changes.`;
    bot.telegram.sendMessage(config.ADMIN, message, telegram.Extra.markdown());
    return;
  }

  const hooks = await db.get('bot.webhooks').value();

  Object.keys(result.classes).forEach((name) => {
    const post = result.classes[name];
    const pre = old.classes[name];
    let message = '';

    // Check for new or modified activities
    post.sections.forEach((section) => {
      const record = pre.sections.find(
        (oldSection) => oldSection.label === section.label
      );
      let text = '';
      if (!record) {
        Object.keys(section.activities).forEach((hash) => {
          const activity = section.activities[hash];
          text += '\n• ' + activity.toMarkdown();
        });
      } else if (section.hash !== record.hash) {
        Object.keys(section.activities).forEach((hash) => {
          if (!record.activities[hash]) {
            const activity = section.activities[hash];
            text += '\n• ' + activity.toMarkdown();
          }
        });
      }
      if (text) {
        message += `\n\n🏷 *${section.label}*\n`;
        message += text;
      }
    });

    if (message) {
      let text = `${COURSE_EMOJI[name]} *${name}*`;
      text += message;
      bot.telegram
        .sendMessage(
          config.GROUP,
          text,
          telegram.Extra.markdown().webPreview(false)
        )
        .catch((err) => {
          console.error(TAG, err.message || 'Error');
        });

        hooks.forEach((hook) => {
          axios.post(hook.url, {
            "username": "ICE alert",
            "avatar_url": "https://i.imgur.com/9Ut9KRw.jpg",
            "embeds": [
              {
                "title": post.name,
                "url": post.url,
                "description": text,
                "color": 15258703,
                "footer": {
                  "text": "made by Filippo Rossi <3",
                  "icon_url": "https://www.gravatar.com/avatar/c6f9b5cada1f83e998c40ed89a929990"
                }
              }
            ]
          })
          .catch((err) => {
            console.error(TAG, err.message || 'Error');
          });
        })
    }
  });

  db.set('dol', result).write();
};

export default notify;
