import puppeteer from 'puppeteer';
import cron from 'node-cron';
import moment from 'moment-timezone';
import fs from 'fs';

import alert from './alert.js';
import parse from './parse.js';

import config from '../../config/index.js';
import Class from '../../types/class.js';

const TAG = '[ZENO]';

const job = (state, hook) => {
  return async () => {
    console.log(
      TAG,
      `Running job at ${moment()
        .tz('Europe/Paris')
        .locale('en_GB')
        .format('LLLL')}`
    );
    if (state.jobs.zeno.operational) {
      state.jobs.zeno.lastExecution = moment()
        .tz('Europe/Paris')
        .locale('en_GB')
        .format('LLLL');
      let result = undefined;
      try {
        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        result = await scrape(page);
        await browser.close();
      } catch (error) {
        state.jobs.zeno.error = error;
        state.jobs.zeno.operational = false;
        throw error;
      }
      hook(result);
    }
  };
};

const schedule = async (state, hook) => {
  if (config.ENV === 'production') {
    job(state, hook)();
    cron.schedule('*/15 7-17 * * *', job(state, hook)); // UTC time
  } else {
    job(state, hook)();
  }
};

const scrape = async (page) => {
  // If cache exists and we are in a development environment,
  // we can scrape it instead of opening a pupeteer instance
  if (config.ENV !== 'production') {
    let cache = true;
    cache &= fs.existsSync('.cache/zeno-home.html');
    cache &= fs.existsSync('.cache/zeno-live.html');
    if (cache) {
      console.log(TAG, `Operating from cache as we are in ${config.ENV} env.`);
      const homeHTML = fs.readFileSync('.cache/zeno-home.html');
      const liveHTML = fs.readFileSync('.cache/zeno-live.html');
      const home = await parse.home(homeHTML);
      const live = await parse.live(liveHTML);

      const fisica = new Class();
      fisica.sections = home;
      fisica.name = 'Fisica 1';
      fisica.url = 'https://zenogaburro.com/course/view.php?id=5';
      fisica.live = live;
      const zeno = { 'Fisica 1': fisica };

      fs.writeFile('.cache/zeno.json', JSON.stringify(zeno, null, 2), () => {});

      console.log(TAG, 'Completed job');
      return zeno;
    }
  }

  // Zeno's page sometime timeouts at 30'000
  await page.setDefaultNavigationTimeout(60000);

  console.log(TAG, 'Browsing zenogaburro.com with puppeteer');
  await page.goto('https://zenogaburro.com/login/index.php');

  await page.waitForSelector('#loginbtn');
  await page.type('#username', config.ZG_USERNAME);
  await page.type('#password', config.ZG_PASSWORD);

  await page.click('#loginbtn');

  // HOME
  console.log(TAG, 'Logged in to zenogaburro.com successfully');
  await page.goto('https://zenogaburro.com/course/view.php?id=5');

  console.log(TAG, 'Evaluating zenogaburro.com homepage');
  const homeHTML = await page.evaluate(() => document.body.innerHTML);
  const home = await parse.home(homeHTML);

  // LIVE
  await page.goto(
    'https://zenogaburro.com/mod/bigbluebuttonbn/view.php?id=130'
  );

  console.log(TAG, 'Evaluating zenogaburro.com live page');
  const liveHTML = await page.evaluate(() => document.body.innerHTML);
  const live = await parse.live(liveHTML);

  // Chaching for development environment
  if (config.ENV !== 'production') {
    await console.log(TAG, 'Saving cache...');
    fs.writeFile('.cache/zeno-home.html', homeHTML, () => {});
    fs.writeFile('.cache/zeno-live.html', liveHTML, () => {});
  }

  const fisica = new Class();
  fisica.sections = home;
  fisica.name = 'Fisica 1';
  fisica.url = 'https://zenogaburro.com/course/view.php?id=5';
  fisica.live = live;
  const zeno = { 'Fisica 1': fisica };

  console.log(TAG, 'Completed job');

  return zeno;
};

export default {
  schedule,
  scrape,
  alert,
};
