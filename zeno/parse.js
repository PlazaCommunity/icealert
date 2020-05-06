import cheerio from 'cheerio';
import he from 'he';

import Activity from '../types/activity.js';
import Section from '../types/section.js';
import Timer from '../types/timer.js';

const ICONS_MAP = {
  'link.png': Activity.types.URL,
  'bbb4.png': Activity.types.LIVE,
  'yt4.png': Activity.types.VIDEO,
  'book4.png': Activity.types.WIKI,
  'wiki4.png': Activity.types.WIKI,
  'quiz4.png': Activity.types.FILE,
  'spritz4.png': Activity.types.FUN,
  'written4.png': Activity.types.EXAM,
  'pdfdown4.png': Activity.types.FILE,
  'calendar4.png': Activity.types.DATE,
  'magnifier.png': Activity.types.FILE,
  'photowhite4.png': Activity.types.FILE,
};

const CLEAN_LIST = [
  'Sei iscritto/a Clicca per accedere',
  "Suggerimenti teorici per l'",
];

const typeFromURL = (src) => {
  src = src.substring(src.lastIndexOf('/') + 1).trim();
  if (Object.keys(ICONS_MAP).includes(src)) {
    return ICONS_MAP[src];
  }
  return Activity.types.NO_TYPE;
};

const d = (html) => {
  if (html) {
    html = html.replace(/<(?:.|\n)*?>/gm, '\n');
    html = he.decode(html);
    html = html
      .trim()
      .replace(/\s\s+/g, ' ')
      .replace(/(\r\n|\n|\r)/gm, ' ');
    CLEAN_LIST.forEach((e) => (html = html.replace(e, '')));
    return html;
  }
};

const activity = (activityHTML) => {
  const $ = cheerio.load(activityHTML);
  const name = d($('table tbody tr').html());

  const activity = new Activity();
  activity.name = name;
  activity.link = $('a').attr('href');

  const src = $('table tbody tr img').attr('src')
  activity.type = typeFromURL(src);

  activity.hash = activity.createHash();
  return activity;
};

const video = (videoHTML) => {
  const $ = cheerio.load(videoHTML);
  const activity = new Activity();
  if ($('iframe').length) {
    activity.name = 'Youtube Video';
    activity.link = $('iframe').attr('src');
  } else {
    activity.name = $('video').attr('title') || 'video.mp4';
    activity.link = $('source').attr('src');
  }

  activity.type = Activity.types.VIDEO;

  activity.hash = activity.createHash();
  return activity;
};

const timer = (timerHTML) => {
  const $ = cheerio.load(timerHTML);
  const scriptHTML = $('script').html();
  const dateREGEX = /var deadline = '(.*)';/im;

  if (dateREGEX.test(scriptHTML)) {
    const timer = new Timer();
    timer.name = d($('p').html());
    timer.date = new Date(dateREGEX.exec(scriptHTML)[1]);
    timer.hash = timer.createHash();

    return timer;
  }
  
  return undefined;
};

const section = (sectionHTML) => {
  const $ = cheerio.load(sectionHTML);
  const label = $('span.sectionname').text();
  let section = new Section();
  section.label = label;
  section.timers = {};

  if (label) {
    $('li.activity').each((_, element) => {
      const hasName = !!$(element).find('table tbody tr').text();
      const isVideo = $(element).find('.mediaplugin_videojs').length;
      const isTimer = $(element).find('.seconds').length;

      if (hasName) {
        const res = activity($(element).find('.activity-wrapper').html())
        if (res) section.activities[res.hash] = res;
      }

      if (isVideo) {
        const res = video($(element).find('.activity-wrapper').html())
        if (res) section.activities[res.hash] = res;
      }

      if (isTimer) {
        const res = timer($(element).find('.activity-wrapper').html())
        if (res) section.timers[res.hash] = res;
      }
    });

    section.hash = section.createHash();
    return section;
  }

  return null;
};

const home = (homeHTML) => {
  const $ = cheerio.load(homeHTML);
  let home = [];

  $('ul.buttons li').each((_, element) => {
    const res = section($(element).html())
    if (res) home.push(res);
  });
  return home;
};

const live = (liveHTML) => {
  let $ = cheerio.load(liveHTML);
  const isLive =
    $('#status_bar_span').text().trim() === 'This conference is in progress.';
  const status = $('#control_panel_div').text().trim();
  return {
    isLive,
    status,
  };
};

export default {
  home,
  live,
};
