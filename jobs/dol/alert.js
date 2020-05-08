import notify from '../../notify/index.js';
import config from '../../config/index.js';

const TAG = '[DOL]';

const COURSE_EMOJI = {
  'Analisi matematica 2': '🧮',
  'Programmazione 2': '💻',
  'Calcolo delle probabilità': '📊',
};

const alert = (bot, db) => async (result) => {
  if (!result) {
    const message = `⛔️ *ERROR*: job _DOL_ failed to update! Check status for more info.`;
    bot.telegram.sendMessage(config.ADMIN, message, notify.Extra.markdown());
    return;
  }

  const old = await db.get('dol').value();
  if (!old) {
    db.set('dol', result).write();
    const message = `✳️ *INFO*: job _DOL_ was never initialized. First run will not notify changes.`;
    bot.telegram.sendMessage(config.ADMIN, message, notify.Extra.markdown());
    return;
  }

  const classes = Object.keys(result.classes);
  const errors = false;

  for (let i in classes) {
    const name = classes[i];
    const post = result.classes[name];
    const pre = old.classes[name];

    const messages = {
      changes: '',
    };

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
        messages.changes += `\n\n🏷 *${section.label}*\n`;
        messages.changes += text;
      }
    });

    if (messages.changes) {
      messages.changes = `${COURSE_EMOJI[name]} *${name}*` + messages.changes;
      try {
        await bot.telegram.sendToGroup(messages.changes);
        await bot.webhooks.send(post.name, post.url, messages.changes);
      } catch (err) {
        errors = true;
        console.error(TAG, err);
      }
    }
  }

  if (!errors) {
    db.set('dol', result).write();
  }
};

export default alert;
