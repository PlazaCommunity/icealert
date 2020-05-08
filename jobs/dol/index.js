import puppeteer from 'puppeteer';
import cron from 'node-cron';
import moment from 'moment-timezone';
import fs from 'fs';

import alert from './alert.js';
import parse from './parse.js';

import config from '../../config/index.js';
import Class from '../../types/class.js';

const TAG = '[DOL]';

const job = (state, hook) => {
  return async () => {
    console.log(
      TAG,
      `Running job at ${moment()
        .tz('Europe/Paris')
        .locale('en_GB')
        .format('LLLL')}`
    );
    if (state.jobs.dol.operational) {
      state.jobs.dol.lastExecution = moment()
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
        state.jobs.dol.error = error;
        state.jobs.dol.operational = false;
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
    cache &= fs.existsSync('.cache/dol-courses.html');
    if (cache) {
      const coursesHTML = fs.readFileSync('.cache/dol-courses.html');
      const courses = parse.courses(coursesHTML);

      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        cache &= fs.existsSync(`.cache/dol-course-${course.id}.html`);
      }

      if (cache) {
        console.log(
          TAG,
          `Operating from cache as we are in ${config.ENV} env.`
        );

        const classes = {};

        for (let i = 0; i < courses.length; i++) {
          const course = courses[i];
          const courseHTML = fs.readFileSync(
            `.cache/dol-course-${course.id}.html`
          );
          const sections = parse.sections(courseHTML);
          classes[course.name] = new Class();
          classes[course.name].sections = sections;
          classes[course.name].name = course.name;
          classes[course.name].url = course.link;
        }

        fs.writeFile(
          '.cache/dol-result.json',
          JSON.stringify(classes, null, 2),
          () => {}
        );
        console.log(TAG, 'Completed job');
        return {
          classes,
        };
      }
    }
  }

  console.log(TAG, 'Browsing webapps.unitn.it with puppeteer');
  await page.goto('https://webapps.unitn.it/GestioneCorsi/IndexAuth');

  await page.waitForSelector('#btnAccedi');
  await page.type('#clid', config.DOL_USERNAME);
  await page.type('#inputPassword', config.DOL_PASSWORD);

  await page.click('#btnAccedi');

  await page.waitForSelector('.table-striped');

  console.log(TAG, 'Evaluating webapps.unitn.it courses...');
  const coursesHTML = await page.evaluate(() => document.body.innerHTML);
  const courses = parse.courses(coursesHTML);

  const classes = {};

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    console.log(TAG, `Visiting course ID: ${course.id}`);

    await page.goto(course.link);
    await page.waitForSelector('.course-content');
    const courseHTML = await page.evaluate(() => document.body.innerHTML);

    const sections = parse.sections(courseHTML);
    classes[course.name] = new Class();
    classes[course.name].sections = sections;
    classes[course.name].url = course.link;

    // Chaching course for development environment
    if (config.ENV !== 'production') {
      await console.log(TAG, 'Saving cache...');
      fs.writeFile(`.cache/dol-course-${course.id}.html`, courseHTML, () => {});
      fs.writeFile(
        '.cache/dol-result.json',
        JSON.stringify(classes, null, 2),
        () => {}
      );
    }
  }

  // Chaching courses homepage for development environment
  if (config.ENV !== 'production') {
    await console.log(TAG, 'Saving cache...');
    fs.writeFile('.cache/dol-courses.html', coursesHTML, () => {});
  }

  console.log(TAG, 'Completed job');

  return {
    classes,
  };
};

export default {
  schedule,
  scrape,
  alert,
};
