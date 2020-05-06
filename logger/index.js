import util from 'util';

const initialize = (sendMessage) => {
  console.info = async function () {
    const message = util.format.apply(this, arguments);
    return sendMessage(`[*] ${message}`);
  };

  console.log = console.info;

  console.warn = async function () {
    const message = util.format.apply(this, arguments);
    return sendMessage(`[w] ${message}`);
  };

  console.error = async function () {
    const message = util.format.apply(this, arguments);
    return sendMessage(`[!] ${message}`);
  };
};

const timestamp = () => {
  const duration = Date.now();
  let milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  return `[${hours}:${minutes}:${seconds}]`;
}

export default {
  initialize,
  timestamp,
};
