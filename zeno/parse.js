import cheerio from 'cheerio';
import crypto from 'crypto';
import he from 'he';

const ICONS_MAP = {
  'magnifier.png': 'ESERCIZIO',
  'yt4.png': 'VIDEO',
  'pdfdown4.png': 'PDF',
  'bbb4.png': 'REGISTRAZIONE LIVE',
  'book4.png': 'SUGGERIMENTO',
  'wiki4.png': 'WIKI',
  'spritz4.png': 'SPRITZ',
  'link.png': 'LINK',
};

const CLEAN_LIST = [
  'Sei iscritto/a Clicca per accedere',
  "Suggerimenti teorici per l'",
];

const typeFromIcon = (src) => {
  return ICONS_MAP[src.substring(src.lastIndexOf('/') + 1)];
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

const home = (homeHTML) => {
  let $ = cheerio.load(homeHTML);
  let home = [];

  $('ul.buttons li').each((index, element) => {
    const label = $(element).attr('aria-label');
    const url = $(element).find('.sectionname a').attr('href');
    if (label) {
      let section = { label, url, activities: {}, timers: {} };
      $(element)
        .find('ul.section li.activity')
        .each((_, element) => {
          const name = d($(element).find('table tbody tr').html());

          // It's an activity
          // Activity: {name, link, type?}
          if (name) {
            const activity = {};
            activity.name = name;
            activity.link = $(element).find('a').attr('href');
            if (label !== 'General') {
              activity.type = typeFromIcon(
                $(element).find('table tbody tr img').attr('src')
              );
            }

            activity.hash = crypto
              .createHash('sha256')
              .update(JSON.stringify(activity))
              .digest('hex');
            section.activities[activity.hash] = activity;
            return;
          }

          // It's a video,
          // subclass of acitivy
          if ($(element).find('.mediaplugin_videojs').length) {
            const activity = {};
            // youtube...
            if ($(element).find('iframe').length) {
              activity.name = 'Youtube Video';
              activity.link = $(element).find('iframe').attr('src');
            }
            // self hosted...
            else {
              activity.name = $(element).find('video').attr('title');
              activity.link = $(element).find('source').attr('src');
            }
            activity.type = 'VIDEO';

            activity.hash = crypto
              .createHash('sha256')
              .update(JSON.stringify(activity))
              .digest('hex');
            section.activities[activity.hash] = activity;
          }

          // It's a timer
          // Timer: { title, date }
          if ($(element).find('.seconds').length) {
            const scriptHTML = $(element).find('script').html();
            const dateREGEX = /var deadline = '(.*)';/im;
            if (dateREGEX.test(scriptHTML)) {
              const timer = {};
              timer.name = d($(element).find('p').html());
              timer.date = new Date(dateREGEX.exec(scriptHTML)[1]);
              timer.hash = crypto
                .createHash('sha256')
                .update(JSON.stringify(timer))
                .digest('hex');
              section.timers[timer.hash] = timer;
            }
          }
        });
      section.hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(section))
        .digest('hex');
      home.push(section);
    }
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
