import 'dotenv/config.js';

const ADMIN = process.env.TELEGRAM_ADMIN_ID;
const GROUP =
  process.env.NODE_ENV === 'production'
    ? process.env.TELEGRAM_GROUP_ID_PRD
    : process.env.TELEGRAM_GROUP_ID_DEV;

const STORAGE =
  process.env.NODE_ENV === 'production'
    ? process.env.STORAGE_PRD
    : process.env.STORAGE_DEV;

export default {
  ADMIN,
  GROUP,
  STORAGE
}