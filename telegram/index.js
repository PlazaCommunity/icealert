import Telegraf from 'telegraf';
import Extra from 'telegraf/extra.js';
import Markup from 'telegraf/markup.js';

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

const initialize = async (state, db) => {
  const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

  const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]+)?$/i;
  
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

  bot.use((ctx, next) => {
    if (ctx.updateType === 'message' && ctx.from) {
      ctx.from.is_admin = String(ctx.from.id) == process.env.TELEGRAM_ADMIN_ID;
    }
    return next();
  });

  bot.on('channel_post', (ctx) => {
    if (ctx.channelPost.text === '/chatid') {
      ctx.replyWithMarkdown(`🏷 Chat ID of this channel: *${ctx.chat.id}*`);
    }
  });

  bot.start((ctx) => {
    if (ctx.from.is_admin) {
      return ctx.replyWithMarkdown('✅ Welcome back!');
    }
    return ctx.replyWithMarkdown('⛔️ Unauthorized');
  });

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

  bot.command('hook', async (ctx) => {
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
            .write()
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
          })
      } else if (mode === 'list') {
        const list = await channels.value();
        let message = '〽️*Webhooks*\n\n';
        if (list.length) {
          message += '👇👇👇';
          list.forEach((hook) => {
            message += `\n\n*${hook.name}:*\n`;
            message += `\`${hook.url}\`\n`;
          });
        } else {
          message += '❌ No webhooks found'
        }
        return ctx.replyWithMarkdown(message);
      }
    }
  });

  bot.command('stop', (ctx) => {
    if (ctx.from.is_admin) {
      ctx
        .replyWithMarkdown('✅ *Shutting down* gracefully')
        .then(() => process.exit(0));
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const endpoint = Math.random().toString(36).substring(2, 15);
    bot.telegram.webhookReply = false;
    await bot.telegram.setWebhook(
      `https://icealert.filipporossi.dev/${endpoint}`
    );
    bot.startWebhook(`/${endpoint}`, null, process.env.PORT);
  } else {
    await bot.telegram.deleteWebhook();
    bot.startPolling();
  }
  return bot;
};

export default {
  initialize,
  Extra,
  Markup,
};
