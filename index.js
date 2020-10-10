const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const emojiLibrary = ['🤑', '🕶', '😎', '🤩', '♠️', '💰', '💲💲', '🔥', '🙈', '😈'];
const motivationPhrases = ['Go play', 'Join in', 'Come get their money', 'Fishing time'];

const apiEndpoint = process.env.ENDPOINT !== undefined ? process.env.ENDPOINT : 'https://play.fair.poker/lobby-data';
const groupID = process.env.GROUP_ID;
const refreshIntervalSec = process.env.REFRESH_INTERVAL_SEC !== undefined ? process.env.REFRESH_INTERVAL_SEC : 10;

let prevRunningTablesCount = 0;
let prevWaitingForPlayersCount = 0;
let lastMessageSent = '';
let lastMessageSentTime = new Date();

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TOKEN, {polling: true});

const pluralizeWordAndArticle = (count, word) => count > 1 ? `${count} ${word}s are` : `${count} ${word} is`;
const getMotivationPhrase = () => `${motivationPhrases[Math.floor(Math.random() * motivationPhrases.length)]} ${emojiLibrary[Math.floor(Math.random() * emojiLibrary.length)]}`;

const alertGroup = (tables) => {
  const waitingForPlayers = tables.filter(x => x.playersSeatedCount === 1);
  const runningTables = tables.filter(x => x.playersSeatedCount > 1);

  const waitingForPlayersCount = waitingForPlayers.length;
  const runningTablesCount = runningTables.length;


  let message = '';
  if (waitingForPlayersCount > prevWaitingForPlayersCount && runningTablesCount > 0 || runningTablesCount > prevRunningTablesCount && waitingForPlayersCount > 0) {
    message = `${pluralizeWordAndArticle(waitingForPlayersCount, 'table')} waiting for players to join and ${pluralizeWordAndArticle(runningTablesCount, 'table')} running.`;
  } else if (waitingForPlayersCount > prevWaitingForPlayersCount) {
      message = `${pluralizeWordAndArticle(waitingForPlayersCount, 'table')} waiting for players.`;
  } else if (runningTablesCount > prevRunningTablesCount) {
      message = `${pluralizeWordAndArticle(runningTablesCount, 'table')} running.`;
  }

  // Send a mesage if the message is different from the last sent one 
  // or if the message is the same wait at least 1h before repeating it
  const minFromLastMessageSent = (new Date() - lastMessageSentTime) / (1000 * 60);
  if (message !== '' && (message !== lastMessageSent || minFromLastMessageSent >= 60)) {
    lastMessageSent = message;
    lastMessageSentTime = new Date();
    bot.sendMessage(groupID, `${message} ${getMotivationPhrase()}`);
  }

  prevWaitingForPlayersCount = waitingForPlayersCount;
  prevRunningTablesCount = runningTablesCount;
}

const checkRunningTables = () => {
  axios
    .get(apiEndpoint)
    .then((res) => {
      alertGroup(res.data.tables);
    })
    .catch(err => console.log('error getting table data', err));
}

setInterval(checkRunningTables, refreshIntervalSec * 1000);