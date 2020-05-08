import cheerio from 'cheerio';

import Activity from '../../types/activity.js';
import Section from '../../types/section.js';

const TYPE_MAP = {
  File: Activity.types.FILE,
  Video: Activity.types.VIDEO,
  'Kaltura Video Resource': Activity.types.VIDEO,
  URL: Activity.types.URL,
  Cartella: Activity.types.FOLDER,
  Forum: Activity.types.FORUM,
};

const fromType = (type) => {
  if (Object.keys(TYPE_MAP).includes(type)) {
    return TYPE_MAP[type];
  }
  return Activity.types.NO_TYPE;
};

const activity = (activityHTML) => {
  const $ = cheerio.load(activityHTML);
  const activity = new Activity();

  let raw = $('.instancename').text();
  let type = $('.accesshide').text();

  if (!raw) return null;

  activity.name = raw.replace(type, '').trim();
  activity.type = fromType(type.trim());
  activity.link = $('a').attr('href');

  activity.hash = activity.createHash();

  return activity;
};

const section = (sectionHTML) => {
  const $ = cheerio.load(sectionHTML);
  const section = new Section();
  section.label = $('.sectionname').text();

  $('.activity').each((_, element) => {
    const res = activity($(element).html());
    if (res) section.activities[res.hash] = res;
  });

  section.hash = section.createHash();

  return section;
};

const sections = (courseHTML) => {
  const $ = cheerio.load(courseHTML);
  const sections = [];

  $('.topics .content').each((_, element) => {
    const res = section($(element).html());
    const dup = sections.findIndex((other) => {
      return res.label === other.label;
    });
    if (dup !== -1) {
      sections[dup].activities = {
        ...sections[dup].activities,
        ...res.activities,
      };
      sections[dup].hash = sections[dup].createHash();
    } else {
      sections.push(res);
    }
  });

  return sections;
};

const courses = (coursesHTML) => {
  const $ = cheerio.load(coursesHTML);

  const courses = [];

  $('#studentCourseTable table tbody tr td:first-child').each((_, element) => {
    const label = $(element).find('div:first-child').text();
    const link = $(element).find('div:first-child a').attr('href');
    const id = /\[([0-9]+)\]/g.exec(label)[1].trim();
    const name = /(.*)\[/g.exec(label)[1].trim();
    courses.push({ name, id, link });
  });

  return courses;
};

export default {
  courses,
  sections,
};
