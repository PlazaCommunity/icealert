import crypto from 'crypto';

class Section {
  constructor() {
    this.label = 'Unnamed section';
    this.activities = {};
  }
  createHash() {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(this))
      .digest('hex');
  }
}

export default Section;
