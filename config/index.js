import 'dotenv/config.js';

const STORAGE =
  process.env.NODE_ENV === 'production'
    ? process.env.STORAGE_PRD
    : process.env.STORAGE_DEV;

const ENV = process.env.NODE_ENV;
const PORT = process.env.PORT;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

const TELEGRAM_ADMIN = process.env.TELEGRAM_ADMIN_ID;
const TELEGRAM_GROUP =
  process.env.NODE_ENV === 'production'
    ? process.env.TELEGRAM_GROUP_ID_PRD
    : process.env.TELEGRAM_GROUP_ID_DEV;

const ZG_USERNAME = process.env.ZG_USERNAME;
const ZG_PASSWORD = process.env.ZG_PASSWORD;
const DOL_USERNAME = process.env.DOL_USERNAME;
const DOL_PASSWORD = process.env.DOL_PASSWORD;

const BOT_NAME = 'ICE alert';
const BOT_IMAGE = 'https://i.imgur.com/9Ut9KRw.jpg';
const AUTHOR_IMAGE =
  'https://www.gravatar.com/avatar/c6f9b5cada1f83e998c40ed89a929990';

export default {
  STORAGE,
  PORT,
  ENV,
  TELEGRAM_TOKEN,
  TELEGRAM_ADMIN,
  TELEGRAM_GROUP,
  ZG_USERNAME,
  ZG_PASSWORD,
  DOL_USERNAME,
  DOL_PASSWORD,
  BOT_NAME,
  BOT_IMAGE,
  AUTHOR_IMAGE,
};
