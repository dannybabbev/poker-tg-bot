const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const emojiLibrary = ['🤑', '🕶', '😎', '🤩', '♠️', '💰', '💲💲', '🔥', '🙈', '😈'];
const motivationPhrases = ['Go play', 'Join in', 'Come get their money', 'Fishing time'];

const apiEndpoint = process.env.ENDPOINT !== undefined ? process.env.ENDPOINT : 'https://play.fair.poker';
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

const alertGroup = async (tables) => {
  const tablesWaitingForPlayers = tables.filter(x => x.playersSeatedCount === 1).length;
  const tablesRunning = tables.filter(x => x.playersSeatedCount > 1).length;


  // Printout of the lobby
  let message = '';
  const activeTables = tables
    .filter(x => x.playersSeatedCount > 0)
    .sort(x => x.playersSeatedCount);
  
  // We can't use async/await in .forEach so forced to use old-style for...of loop
  for (const table of activeTables) {
    const tableData = await axios.get(`${apiEndpoint}/table-data/${table.id}`);
    // Leaving the players as an array, as we may want to add them in the message when there is more than one player on the table
    const players = tableData.data.table.seats.filter(x => x !== null).map(x => x.name).sort();

    if (table.playersSeatedCount > 1) {
      message += `${table.playersSeatedCount} players at ${getBits(table.smallBlind)}/${getBits(table.bigBlind)} (${table.gameMode})\n`
    } else {
      message += `'${players[0]}' is waiting at ${getBits(table.smallBlind)}/${getBits(table.bigBlind)} (${table.gameMode})\n`
    }
  }

  // Send a mesage if the message is different from the last sent one 
  // or if the message is the same wait at least 1h before repeating it
  const minFromLastMessageSent = (new Date() - lastMessageSentTime) / (1000 * 60);
  if (message !== ''
    && (tablesRunning > prevTablesRunning || tablesWaitingForPlayers > prevTablesWaitingForPlayers || minFromLastMessageSent >= 60)
    && (message !== lastMessageSent || minFromLastMessageSent >= allowRepeatMessageAfterMin)) {
    lastMessageSent = message;
    lastMessageSentTime = new Date();

    console.log('sending message', message);

    bot.sendMessage(groupID, `${message}${getRandMotivationPhrase()}`);
  }

  prevTablesWaitingForPlayers = tablesWaitingForPlayers;
  prevTablesRunning = tablesRunning;
}

const checkRunningTables = async () => {
  const res = await axios.get(`${apiEndpoint}/lobby-data`);
  alertGroup(res.data.tables);
}

checkRunningTables();
setInterval(checkRunningTables, refreshIntervalSec * 1000);