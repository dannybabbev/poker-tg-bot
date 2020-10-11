const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const emojiLibrary = ['🤑', '🕶', '😎', '🤩', '♠️', '💰', '💲💲', '🔥', '🙈', '😈'];
const motivationPhrases = ['Go play', 'Join in', 'Come get their money', 'Fishing time'];

const apiEndpoint = process.env.ENDPOINT !== undefined ? process.env.ENDPOINT : 'https://play.fair.poker/lobby-data';
const groupID = process.env.GROUP_ID;
const refreshIntervalSec = process.env.REFRESH_INTERVAL_SEC !== undefined ? process.env.REFRESH_INTERVAL_SEC : 10;
const allowRepeatMessageAfterMin = process.env.ALLOW_REPEAT_MESSAGE_MIN !== undefined ? process.env.ALLOW_REPEAT_MESSAGE_MIN : 120;

let prevTablesRunning = 0;
let prevTablesWaitingForPlayers = 0;
let lastMessageSent = '';
let lastMessageSentTime = new Date();

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.TOKEN, {polling: true});

const getRandMotivationPhrase = () => `${motivationPhrases[Math.floor(Math.random() * motivationPhrases.length)]} ${emojiLibrary[Math.floor(Math.random() * emojiLibrary.length)]}`;
const getBits = (sat) => sat / 100;

const alertGroup = (tables) => {
  const tablesWaitingForPlayers = tables.filter(x => x.playersSeatedCount === 1).length;
  const tablesRunning = tables.filter(x => x.playersSeatedCount > 1).length;


  // Printout of the lobby
  let message = '';
  tables
    .filter(x => x.playersSeatedCount > 0)
    .sort(x => x.playersSeatedCount)
    .forEach(x => {
      if (x.playersSeatedCount > 1) {
        message += `${x.playersSeatedCount} players at ${getBits(x.smallBlind)}/${getBits(x.bigBlind)} (${x.gameMode})\n`
      } else {
        message += `1 player is waiting at ${getBits(x.smallBlind)}/${getBits(x.bigBlind)} (${x.gameMode})\n`
      }
    });


  // Send a mesage if the message is different from the last sent one 
  // or if the message is the same wait at least 1h before repeating it
  const minFromLastMessageSent = (new Date() - lastMessageSentTime) / (1000 * 60);
  if (message !== ''
    && (tablesRunning > prevTablesRunning || tablesWaitingForPlayers > prevTablesWaitingForPlayers || minFromLastMessageSent >= allowRepeatMessageAfterMin)
    && (message !== lastMessageSent || minFromLastMessageSent >= allowRepeatMessageAfterMin)) {
    lastMessageSent = message;
    lastMessageSentTime = new Date();

    console.log('sending message', message);

    bot.sendMessage(groupID, `${message}${getRandMotivationPhrase()}`);
  }

  prevTablesWaitingForPlayers = tablesWaitingForPlayers;
  prevTablesRunning = tablesRunning;
}

const checkRunningTables = () => {
  axios
    .get(apiEndpoint)
    .then((res) => {
      alertGroup(res.data.tables);
    })
    .catch(err => console.log('error getting table data', err));
}

checkRunningTables();
setInterval(checkRunningTables, refreshIntervalSec * 1000);