import moment from 'moment-timezone';
import crypto from 'crypto';

export default class Timer {
  createHash() {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(this))
      .digest('hex');
  }
  toMarkdown() {
    let message = `*${this.name}*\n`;
    const now = moment();
    const deadline = moment(this.date);
    const countdown = moment.duration(deadline - now);
    message += `📅 ${deadline
      .tz('Europe/Paris')
      .locale('it')
      .format('LLLL')}\n`;
    message += 'tra ';
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
  }
}