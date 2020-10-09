const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const apiEndpoint = process.env.ENDPOINT !== undefined ? process.env.ENDPOINT : 'https://play.fair.poker/lobby-data';
const groupID = process.env.GROUP_ID;
const refreshIntervalSec = 10;

let runningTablesCount = 0;
let waitingForPlayersCount = 0;
let lastMessageSent = '';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TOKEN, {polling: true});

const pluralizeWordAndArticle = (count, word) => count > 1 ? `${count} ${word}s are` : `${count} ${word} is`;

const alertGroup = (tables) => {
  const waitingForPlayers = tables.filter(x => x.playersSeatedCount === 1);
  const runningTables = tables.filter(x => x.playersSeatedCount > 1);

  const newWaitingForPlayersCount = waitingForPlayers.length;
  const newRunningTablesCount = runningTables.length;


  let message = '';
  if (newWaitingForPlayersCount > waitingForPlayersCount && newRunningTablesCount > runningTablesCount) {
    message = `${pluralizeWordAndArticle(newWaitingForPlayersCount, 'table')} waiting for players to join and ${pluralizeWordAndArticle(newRunningTablesCount, 'table')} running`;
  } else if (newWaitingForPlayersCount > waitingForPlayersCount) {
    message = `${pluralizeWordAndArticle(newWaitingForPlayersCount, 'table')} waiting for players. Join in!`;
  } else if (newRunningTablesCount > runningTablesCount) {
    message = `${pluralizeWordAndArticle(newRunningTablesCount, 'table')} running. Join in!`;
  }

  if (message !== '' && message !== lastMessageSent) {
    lastMessageSent = message;
    bot.sendMessage(groupID, message);
  }

  waitingForPlayersCount = newWaitingForPlayersCount;
  runningTablesCount = newRunningTablesCount;
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