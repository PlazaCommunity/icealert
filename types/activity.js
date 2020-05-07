import crypto from 'crypto';

const excape = (msg) => {
  return msg.replace(/((\_|\*|\~|\`|\|))/g, '\\$1');
}

class Activity {
  static types = {
    URL: 'URL',
    FUN: 'FUN',
    FILE: 'FILE',
    DATE: 'DATE',
    WIKI: 'WIKI',
    LIVE: 'LIVE',
    EXAM: 'EXAM',
    VIDEO: 'VIDEO',
    FORUM: 'FORUM',
    FOLDER: 'FOLDER',
    NO_TYPE: 'NO_TYPE'
  };

  static icons = {
    URL: '🔗',
    FUN: '🍹',
    FILE: '📚',
    DATE: '📅',
    WIKI: '🤓',
    LIVE: '🅾️',
    EXAM: '📝',
    VIDEO: '🎥',
    FORUM: '👥',
    FOLDER: '📂',
    NO_TYPE: '➕'
  };

  constructor() {
    this.name = 'Unnamed activity';
    this.type = 'NO_TYPE';
    this.link = '';
  }

  createHash() {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(this))
      .digest('hex');
  }

  // name
  // type
  // link
  // hash?
  toMarkdown() {
    let message = ''
    if (this.type) {
      message += `${Activity.icons[this.type]}`;
    }
    message += `${excape(this.name)}`;
    if (this.link) {
      message += ` [🔗 Link](${this.link})`;
    }
    return message;
  }
}

export default Activity;
