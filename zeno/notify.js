import telegram from '../telegram/index.js';
import config from '../config/index.js';

const TAG = '[ZENO]';
const COURSE = 'Fisica 1';

const notify = (bot, db) => (
  async (result) => {
    if (!result) {
      const message = `⛔️ *ERROR*: job _ZENO_ failed to update! Check status for more info.`;
      bot.telegram.sendMessage(config.ADMIN, message, telegram.Extra.markdown());
      return;
    }

    const old = await db.get('zeno').value();
    if (!old) {
      db.set('zeno', result).write();
      const message = `✳️ *INFO*: job _ZENO_ was never initialized. First run will not notify changes.`;
      bot.telegram.sendMessage(config.ADMIN, message, telegram.Extra.markdown());
      return;
    }

    const pre = old[COURSE];
    const post = result[COURSE];

    // Check if the professor went live
    if (pre.live.isLive != post.live.isLive) {
      if (post.live.isLive) {
        const message = '🎓*Fisica*\n\n🅾️ Zeno è ora *in live*.';
        const keyboard = telegram.Markup.inlineKeyboard([
          telegram.Markup.urlButton(
            '👀 Guarda ora!',
            'https://zenogaburro.com/mod/bigbluebuttonbn/view.php?id=130'
          ),
        ]);
        bot.telegram.sendMessage(
          config.GROUP,
          message,
          telegram.Extra.markdown().markup(keyboard)
        );
      } else {
        const message = '🎓*Fisica*\n\n🅾️ Zeno ha *terminato la sua live*.';
        bot.telegram.sendMessage(config.GROUP, message, telegram.Extra.markdown());
      }
    }

    let message = ''

    // Check for new or modified activities
    post.sections.forEach((section) => {
      const record = pre.sections.find(
        (oldSection) => oldSection.label === section.label
      );
      let text = ''
      if (!record) {
        Object.keys(section.activities).forEach((hash) => {
          const activity = section.activities[hash];
          text += '\n• ' +activity.toMarkdown();
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
        message += `\n\n🏷 *${section.label}*\n`;
        message += text
      }
    });

    if (message) {
      let text = '🎓*Fisica*'
      text += message;
      try {
        await bot.telegram.sendMessage(
          config.GROUP,
          text,
          telegram.Extra.markdown().webPreview(false)
        );
      } catch(err) {
        console.error(TAG, err.message || 'Error')
      }
    }

    db.set('zeno', result).write();
  }
)

export default notify;