import puppeteer from 'puppeteer';
import cron from 'node-cron';
import fs from 'fs';

import parse from './parse.js';

const TAG = '[ZENO]';

const job = (state, hook) => {
  return async () => {
    console.log(TAG, `Running job at ${new Date().toLocaleString('en-GB')}`);
    if (state.jobs.zeno.operational) {
      state.jobs.zeno.lastExecution = new Date();
      let result = undefined;
      try {
        const browser = await puppeteer.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
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
  if (process.env.NODE_ENV === 'production') {
    job(state, hook)();
    cron.schedule('*/15 9-19 * * *', job(state, hook));
  } else {
    job(state, hook)();
  }
};

const scrape = async (page) => {
  // If cache exists and we are in a development environment,
  // we can scrape it instead of opening a pupeteer instance
  if (process.env.NODE_ENV !== 'production') {
    let cache = true;
    cache &= fs.existsSync('data/zeno-home.html');
    cache &= fs.existsSync('data/zeno-live.html');
    if (cache) {
      console.log(
        TAG,
        `Operating from cache as we are in ${process.env.NODE_ENV} env.`
      );
      const homeHTML = fs.readFileSync('data/zeno-home.html');
      const liveHTML = fs.readFileSync('data/zeno-live.html');
      const home = await parse.home(homeHTML);
      const live = await parse.live(liveHTML);

      console.log(TAG, 'Completed job');
      return {
        home,
        live,
      };
    }
  }

  console.log(TAG, 'Browsing zenogaburro.com with puppeteer');
  await page.goto('https://zenogaburro.com/login/index.php');

  await page.waitForSelector('#loginbtn');
  await page.type('#username', process.env.ZG_USERNAME);
  await page.type('#password', process.env.ZG_PASSWORD);

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
  if (process.env.NODE_ENV !== 'production') {
    await console.log(TAG, 'Saving cache...');
    fs.writeFile('data/zeno-home.html', homeHTML, () => {});
    fs.writeFile('data/zeno-live.html', liveHTML, () => {});
  }

  console.log(TAG, 'Completed job');

  return {
    home,
    live,
  };
};

export default {
  schedule,
  scrape,
};
