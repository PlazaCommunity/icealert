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

export default {
  initialize,
};
