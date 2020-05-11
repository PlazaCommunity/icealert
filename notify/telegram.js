import Telegraf from 'telegraf';
import Extra from 'telegraf/extra.js';

import config from '../config/index.js';

class TelegramService {
  constructor(bot) {
    this.bot = bot;
  }

  async sendToGroup(text, extra) {
    extra = extra || Extra.markdown().webPreview(false);
    this.bot.telegram.sendMessage(config.TELEGRAM_GROUP, text, extra);
  }

  async sendToAdmin(text, extra) {
    extra = extra || Extra.markdown().webPreview(false);
    this.bot.telegram.sendMessage(config.TELEGRAM_ADMIN, text, extra);
  }
}

const validURL = (str) => {
  var pattern = new RegExp(
    '^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
      '(\\#[-a-z\\d_]*)?$',
    'i'
  ); // fragment locator
  return !!pattern.test(str);
};

const initialize = async (db, state) => {
  const bot = new Telegraf(config.TELEGRAM_TOKEN);

  const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i;

  /**
   * Command fragmentation middleware
   * eg: "/name@bot arg1 arg2 arg3"
   * {
   *   text: /name@bot arg1 arg2 arg3
   *   command: name,
   *   bot: bot,
   *   args: arg1 arg2 arg3,
   *   splitArgs: [arg1, arg2, arg3]
   * }
   */
  bot.use((ctx, next) => {
    if (ctx.updateType === 'message' && ctx.updateSubTypes.includes('text')) {
      const parts = regex.exec(ctx.message.text.trim());
      if (!parts) return next();
      const command = {
        text: ctx.message.text,
        command: parts[1],
        bot: parts[2],
        args: parts[3],
        get splitArgs() {
          return !parts[3]
            ? []
            : parts[3].split(/\s+/).filter((arg) => arg.length);
        },
      };
      ctx.command = command;
    }
    return next();
  });

  /**
   * Admin middleware
   * user.id == ADMIN?
   */
  bot.use((ctx, next) => {
    if (ctx.updateType === 'message' && ctx.from) {
      ctx.from.is_admin = String(ctx.from.id) == config.TELEGRAM_ADMIN;
    }
    return next();
  });

  /**
   * Get chatid from channel
   */
  bot.on('channel_post', (ctx) => {
    if (ctx.channelPost.text === '/chatid') {
      ctx.replyWithMarkdown(`🏷 Chat ID of this channel: *${ctx.chat.id}*`);
    }
  });

  /**
   * Generate job status report
   * - status
   * - last run
   * - errors?
   */
  bot.command('status', (ctx) => {
    if (ctx.from.is_admin) {
      let status = '〽️*Status*\n\n';
      status += '👇👇👇\n\n';
      Object.keys(state.jobs).forEach((key) => {
        const operational = state.jobs[key].operational
          ? '✅ Ok'
          : '⛔️ Error...';
        const error = state.jobs[key].error;
        const lastExecution = state.jobs[key].lastExecution;

        status += `*${key.toLocaleUpperCase()}*\n`;
        status += `• status: ${operational}\n`;
        if (lastExecution) {
          status += `• last run: _${lastExecution}_\n`;
        } else {
          status += `• last run: _never_\n`;
        }
        if (error) {
          status += `• error message: \`${error}\`\n`;
        }
        status += '\n\n';
      });
      return ctx.replyWithMarkdown(status);
    }
  });

  /**
   * Hooks cli
   * - /hooks add <name> <url> : Add a new webhook
   * - /hooks remove <name>    : Remove an existing webhook
   * - /hooks list             : See all the saved webhooks
   */
  bot.command('hooks', async (ctx) => {
    if (ctx.from.is_admin) {
      const args = ctx.command.splitArgs;
      const mode = args[0];
      const channels = db.get('bot.webhooks');
      if (mode === 'add' && args[1] && args[2]) {
        if (validURL(args[2])) {
          channels
            .push({
              name: args[1],
              url: args[2],
            })
            .write();
          return ctx.replyWithMarkdown('✅ *Added*');
        }
        return ctx.replyWithMarkdown('🛑 *No valid URL*');
      } else if (mode === 'remove' && args[1]) {
        channels
          .remove({
            name: args[1],
          })
          .write()
          .then((a) => {
            if (a.length) {
              return ctx.replyWithMarkdown('🗑 *Deleted*');
            }
            return ctx.replyWithMarkdown('❌ *Not found*');
          });
      } else if (mode === 'list' || !mode) {
        const list = await channels.value();
        let message = '〽️*Webhooks*\n\n';
        if (list.length) {
          message += '👇👇👇';
          list.forEach((hook) => {
            message += `\n\n*${hook.name.toUpperCase()}*\n`;
            message += `• url: \`${hook.url}\`\n`;
          });
        } else {
          message += '❌ No webhooks found';
        }
        return ctx.replyWithMarkdown(message);
      }
    }
  });

  /**
   * Restore state of jobs
   */
  bot.command('restore', (ctx) => {
    if (ctx.from.is_admin) {
      state.jobs = {
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
      };
      ctx.replyWithMarkdown('✅ *Restored*');
    }
  });

  /**
   * Emergency remote shutdown
   */
  bot.command('stop', (ctx) => {
    if (ctx.from.is_admin) {
      ctx
        .replyWithMarkdown('✅ *Shutting down* gracefully')
        .then(() => process.exit(0));
    }
  });

  if (config.ENV === 'production') {
    const endpoint = Math.random().toString(36).substring(2, 15);
    bot.telegram.webhookReply = false;
    await bot.telegram.setWebhook(
      `https://icealert.filipporossi.dev/${endpoint}`
    );
    bot.startWebhook(`/${endpoint}`, null, config.PORT);
  } else {
    await bot.telegram.deleteWebhook();
    bot.startPolling();
  }

  return new TelegramService(bot);
};

export default {
  initialize,
};
