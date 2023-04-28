import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const { BOT_TOKEN, ADMINS_ID } = process.env;
const bot = new Telegraf(BOT_TOKEN);
const chats = JSON.parse(fs.readFileSync("database/db.json", "utf8"));
const citiesData = fs.readFileSync("database/cities15000.txt", "utf8");
const cities = citiesData.split("\n");
const adminUsersId = [];
const callUsers = [];

const checkUser = (ctx, next) =>
  adminUsersId.includes(ctx.from.id)
    ? next()
    : ctx.reply("У тебя нет прав доступа админа");
ADMINS_ID.split(", ").forEach((id) => adminUsersId.push(+id));
let stateMsg = "pool";
let chat;
let callDay = "сегодня";

bot.start((ctx) => {
  chats.push(ctx.message.chat);
  const uniqueIds = [];
  const newChats = [];
  chats.forEach((chat) => {
    if (!uniqueIds.includes(chat.id)) {
      uniqueIds.push(chat.id);
      newChats.push(chat);
    }
  });
  fs.writeFileSync("database/db.json", JSON.stringify(newChats));
  ctx.reply("Hello, this bot...");
});

bot.hears("/allconnects", checkUser, (ctx) => {
  const privates = chats.filter((chat) => chat.type === "private");
  const groups = chats.filter(
    (chat) => chat.type === "supergroup" || chat.type === "group"
  );
  let str = "";

  str += "Users:";
  privates.forEach(
    (user) =>
      (str += `\n <a href="https://${user.username}.t.me">${user.first_name}</a>`)
  );
  str += "\nGroups: ";
  groups.forEach((group) => (str += `\n ${group.title}`));
  ctx.replyWithHTML(str, { disable_web_page_preview: true });
});

// on future)))
/*
function getNextWeekdayDate(weekday) {
  const weekdaysRegex = /понедельник|вторник|сред[ау]|четверг|пятниц[ау]|суббот[ау]|воскресенье/i;
  if (!weekdaysRegex.test(weekday)) {
    throw new Error("Invalid weekday name");
  }

  const weekdaysMap = {
    "понедельник": 1,
    "вторник": 2,
    "среду": 3,
    "четверг": 4,
    "пятницу": 5,
    "субботу": 6,
    "воскресенье": 0
  };

  const today = new Date();
  let date = today.getDate();
  let dayOfWeek = today.getDay();
  let daysUntilNextWeekday = (7 + weekdaysMap[weekday] - dayOfWeek) % 7;

  if (daysUntilNextWeekday === 0) {
    daysUntilNextWeekday = 7;
  }

  date += daysUntilNextWeekday;

  return new Date(today.getFullYear(), today.getMonth(), date);
}

// Пример использования
const weekday = "вторник";
const nextWeekdayDate = getNextWeekdayDate(weekday);
console.log(getNextWeekdayDate(weekday))
console.log(`Следующий ${weekday} - ${nextWeekdayDate.toLocaleDateString()}`);
*/

bot.on("poll_answer", (ctx) => {
  const { id, username, first_name } = ctx.update.poll_answer.user;
  let option_id = ctx.update.poll_answer.option_ids[0];

  if (option_id === 0) {
    callUsers.push({ id: id, username: username, first_name: first_name });
  }
});

bot.hears("/getpollusers", (ctx) => {
  let str = "";

  if (callUsers.length !== 0) {
    str = `На совзоне будут:\n`;
    callUsers.map((user) => {
      str += ` <a href="https://${user.username}.t.me">${user.first_name}</a>`;
    });
  } else {
    str += "На созвоне никого не будет))))";
  }
  ctx.replyWithHTML(str, { disable_web_page_preview: true });
});

function findMatch(word, wordsArray) {
  for (let i = 0; i < wordsArray.length; i++) {
    const baseWord = wordsArray[i].slice(0, -1);
    if (baseWord === word || baseWord === word.slice(0, -1)) {
      return word.slice(0, -1);
    }
  }
  return null;
}

function findCityName(message) {
  let city = [];
  for (let i = 0; i < cities.length; i++) {
    const cityData = cities[i].split("\t");
    if (cityData[3] !== "" && cityData[3].includes(",")) {
      city = cityData[3].split(",");
    } else {
      city.push(cityData[3]);
    }
    for (let j = 0; j < city.length; j++) {
      if (findMatch(message.slice(0, -1), city)) {
        return cityData[17];
      } else if (city[j].toLowerCase() === message.toLowerCase()) {
        return cityData[17];
      }
    }
  }
  return null;
}

bot.on("message", async (ctx) => {
  const regExpValidateTime = /^([01]\d|2[0-3])[:., ]([0-5]\d)/;
  const regExpValidateTime2 = /^([01]?[0-9]|2[0-4])/;
  const regExpTime = /^([01]\d|[0-2][0-9])[:., ]([0-9]\d)/;
  const regExpTime2 = /^[0-9][4-9]/;
  const regExpTitleChat = /(?<=чате ).*$/;
  const regExpCity = /по\s+(.*)/i;
  const regExpTimeMessage = /[ ,.]/g;
  const regExpTomorrow = /завтра/gi;
  const regExpWeekDays =
    /понедельник|вторник|сред[ау]|четверг|пятниц[ау]|суббот[ау]|воскресенье/gi;
  const text_message = ctx.message.text;
  const cityMatch = text_message.match(regExpCity);
  let timeZone;
  const optionsPool = ["Я буду", "Меня не будет", "Буду позже"];

  if (ctx.message.chat.type === "private") {
    if (
      regExpValidateTime.test(text_message) ||
      (regExpValidateTime2.test(text_message) && stateMsg === "time")
    ) {
      let time_message;
      if (regExpValidateTime.test(text_message)) {
        time_message = text_message.replace(regExpTimeMessage, ":");
      } else if (regExpValidateTime2.test(text_message)) {
        if (text_message === "24") {
          time_message = "00:00";
        } else {
          time_message = text_message + ":00";
        }
      }
      if (cityMatch !== "") {
        timeZone = findCityName(cityMatch[1]);
        ctx.reply("Время зафиксировано");
        stateMsg = "pool";
      } else {
        ctx.reply("Город не найден)))");
      }
      await bot.telegram.sendPoll(
        chat.id,
        `${ctx.message.chat.username} хочет организовать созвон ${callDay} на ${time_message} по времени ${timeZone}`,
        optionsPool,
        { is_anonymous: false }
      );
      callDay = "сегодня";
      chat = {};
    } else if (
      regExpTime.test(text_message) ||
      regExpTime2.test(text_message)
    ) {
      stateMsg = "time";
      ctx.reply("Уууупс, такого времени еще не придумали))))");
    } else if (
      regExpTitleChat.test(text_message)[0] ||
      regExpTitleChat.test(text_message)
    ) {
      let title_chat = text_message.match(regExpTitleChat)[0];
      chat = chats.find((chat) => chat.title === title_chat);
      if (chat) {
        if (regExpTomorrow.test(text_message)) {
          callDay = "завтра";
        } else if (regExpWeekDays.test(text_message)) {
          callDay = "в " + text_message.match(regExpWeekDays)[0];
        }
        stateMsg = "time";
        ctx.reply(
          "Во сколько ты хочешь организовать созвон?(формат ввода: XX.XX, XX,XX, XX:XX, XX XX или XX по (город), например(по Киеву)"
        );
      } else {
        stateMsg = "pool";
        ctx.reply("Такого чата в базе не найдено!!!");
      }
    } else {
      ctx.reply("Не валидное сообщение...");
    }
  }
});

bot.launch();