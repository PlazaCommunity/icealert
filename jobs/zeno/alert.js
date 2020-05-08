import notify from '$/notify/index.js';
import config from '$/config/index.js';

const TAG = '[ZENO]';
const COURSE = 'Fisica 1';

const alert = (bot, db) => async (result) => {
  if (!result) {
    const message = `⛔️ *ERROR*: job _ZENO_ failed to update! Check status for more info.`;
    bot.telegram.sendMessage(config.ADMIN, message, notify.Extra.markdown());
    return;
  }

  const old = await db.get('zeno').value();
  if (!old) {
    db.set('zeno', result).write();
    const message = `✳️ *INFO*: job _ZENO_ was never initialized. First run will not notify changes.`;
    bot.telegram.sendMessage(config.ADMIN, message, notify.Extra.markdown());
    return;
  }

  const pre = old[COURSE];
  const post = result[COURSE];

  const messages = {
    live: '',
    changes: '',
  };

  // Check if the professor went live
  if (pre.live.isLive != post.live.isLive) {
    if (post.live.isLive) {
      messages.live = `🎓*${COURSE}*\n\n🅾️ Zeno è ora *in live*.`;
    } else {
      message.live = `🎓*${COURSE}*\n\n🅾️ Zeno ha *terminato la sua live*.`;
    }
    bot.telegram.sendToGroup(message.live);
  }

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
      Object.keys(section.timers).forEach((hash) => {
        const timer = section.timers[hash];
        text += '\n\n⏰ *Timer*:\n' + timer.toMarkdown();
      });
    } else if (section.hash !== record.hash) {
      Object.keys(section.activities).forEach((hash) => {
        if (!record.activities[hash]) {
          const activity = section.activities[hash];
          text += '\n• ' + activity.toMarkdown();
        }
      });
      Object.keys(section.timers).forEach((hash) => {
        if (!record.timers[hash]) {
          const timer = section.timers[hash];
          text += '\n\n⏰ *Timer*:\n' + timer.toMarkdown();
        }
      });
    }
    if (text) {
      messages.changes += `\n\n🏷 *${section.label}*\n`;
      messages.changes += text;
    }
  });

  if (messages.changes) {
    messages.changes = `🎓*${COURSE}*` + messages.changes;
  }

  try {
    for (let type in messages) {
      const message = messages[type];
      if (message) {
        await bot.telegram.sendToGroup(message);
        await bot.webhooks.send(post.name, post.url, message);
      }
    }
    db.set('zeno', result).write();
  } catch (err) {
    console.error(TAG, err.message || 'Error');
  }
};

export default alert;
