import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import cron from "node-cron";

dotenv.config();

const { BOT_TOKEN, ADMINS_ID } = process.env;
const bot = new Telegraf(BOT_TOKEN);
const chats = JSON.parse(fs.readFileSync("database/db.json", "utf8"));
const citiesData = fs.readFileSync("database/cities15000.txt", "utf8");
const cities = citiesData.split("\n");
const adminUsersId = [];
const callUsers = [];

bot.telegram.setMyCommands([
  {
    command: "/start",
    description: "Start bot and get notifications from it",
  },
  {
    command: "/allconnects",
    description:
      "Get all users and groups which connected to bot(Admins command)",
  },
  {
    command: "/getpollusers",
    description: "Get all users who will be on the call",
  },
]);

const checkUser = (ctx, next) =>
  adminUsersId.includes(ctx.from.id)
    ? next()
    : ctx.reply("У тебя нет прав доступа админа");
ADMINS_ID.split(", ").forEach((id) => adminUsersId.push(+id));
let stateMsg = "pool";
let chat;
let callDay = "сегодня";
const optionsPool = ["Я буду", "Меня не будет", "Буду позже"];
const regExpValidateTime = /^([01]\d|2[0-3])[:., ]([0-5]\d)/;
const regExpValidateTime2 = /^([01]?[0-9]|2[0-4])/;
const regExpTime = /^([01]\d|[0-2][0-9])[:., ]([0-9]\d)/;
const regExpTime2 = /^[0-9][4-9]/;
const regExpTimePmAm = /^\d{1,2}([:., ]\d{2})?\s*(am|pm|PM|AM|Am|Pm|pM|aM)/;
const regExpTimePmAm2 = /(\d+)\s?(am|pm|PM|AM|Am|Pm|pM|aM)/i;
const regExpTitleChat = /(?<=чате ).*$/;
const regExpCity = /по\s+(.*)/i;
const regExpTimeMessage = /[ ,.]/g;
const regExpTomorrow = /завтра/gi;
const regExpWeekDays =
  /понедельник|вторник|сред[ау]|четверг|пятниц[ау]|суббот[ау]|воскресенье/gi;

function findCityMatch(word, wordsArray) {
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
      if (findCityMatch(message.slice(0, -1), city)) {
        return cityData[17];
      } else if (city[j].toLowerCase() === message.toLowerCase()) {
        return cityData[17];
      }
    }
  }
  return null;
}

bot.start(async (ctx) => {
  chats.push(ctx.message.chat);
  const uniqueIds = [];
  const newChats = [];
  chats.forEach((chat) => {
    if (!uniqueIds.includes(chat.id)) {
      uniqueIds.push(chat.id);
      newChats.push(chat);
    }
  });
  ctx.reply(
    `Привет👋, это бот🤖 для групп👥, чтобы создавть опросы насчет созвонов📞...
    Формат создания опросов - " (какой-то текст) (завтра, сегодня, в суботту и т. д., этот параметр может быть в любом месте сообщения, а может и вообще его не быть) в чате (Название чата)"
    Пример сообщения - "Я хочу организовать созвон завтра в чате Бот для созвонов"`
  );
  fs.writeFileSync("database/db.json", JSON.stringify(newChats));
});

bot.hears("/allconnects", checkUser, (ctx) => {
  const privates = chats.filter((chat) => chat.type === "private");
  const groups = chats.filter(
    (chat) => chat.type === "supergroup" || chat.type === "group"
  );
  let str = "";

  str += "Пользователи:";
  privates.forEach(
    (user) =>
      (str += `\n <a href="https://${user.username}.t.me">${user.first_name}</a>`)
  );
  str += "\nГруппы: ";
  groups.forEach((group) => (str += `\n ${group.title}`));
  ctx.replyWithHTML(str, { disable_web_page_preview: true });
});

// on future)))
/*
function getNextWeekdayDate(weekday) {
  const weekdaysRegex =
    /понедельник|вторник|сред[ау]|четверг|пятниц[ау]|суббот[ау]|воскресенье/i;
  if (!weekdaysRegex.test(weekday)) {
    throw new Error("Invalid weekday name");
  }

  const weekdaysMap = {
    понедельник: 1,
    вторник: 2,
    среду: 3,
    четверг: 4,
    пятницу: 5,
    субботу: 6,
    воскресенье: 0,
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
const weekday = "понедельник";
const nextWeekdayDate = getNextWeekdayDate(weekday);
console.log(getNextWeekdayDate(weekday));
console.log(`Следующий ${weekday} - ${nextWeekdayDate.toLocaleDateString()}`);
*/

bot.on("poll_answer", (ctx) => {
  const { id, username, first_name } = ctx.update.poll_answer.user;
  let option_id = ctx.update.poll_answer.option_ids[0];

  if (option_id === 0) {
    callUsers.push({ id: id, username: username, first_name: first_name });
    bot.telegram.sendMessage(
      id,
      `Спасибо за ваш ответ. За час, 30, 15 и 5 минут до созвона наш бот уведомит вас!!!`
    );
  }
});

bot.hears("/getpollusers", (ctx) => {
  let str = "";
  if (ctx.message.chat.type === "private") {
    ctx.reply("Уупсс..., эту команду нужно использовать только в группе)))");
  } else {
    if (callUsers.length !== 0) {
      str = `На совзоне будут:\n`;
      callUsers.map((user) => {
        str += ` <a href="https://${user.username}.t.me">${user.first_name}</a>`;
      });
    } else {
      str += "На созвоне никого не будет))))";
    }
    ctx.replyWithHTML(str, { disable_web_page_preview: true });
  }
});

bot.on("message", async (ctx) => {
  const text_message = ctx.message.text;
  const cityMatch = text_message.match(regExpCity);
  let timeZone;

  if (ctx.message.chat.type === "private" && ctx.message.text !== "/start") {
    if (
      regExpValidateTime.test(text_message) ||
      (regExpValidateTime2.test(text_message) && stateMsg === "time")
    ) {
      let time_message;
      if (regExpTimePmAm.test(text_message)) {
        let time = text_message.slice(0, 2);
        let timeForm = text_message.match(regExpTimePmAm);
        let hours = Number(time);
        let minutes = timeForm[1] === undefined ? "00" : timeForm[1].slice(1);

        if (hours < 10) {
          hours = "0" + hours;
          hours = Number(hours);
        }

        if (timeForm[2].toLowerCase() === "pm" && hours !== 12) {
          hours += 12;
        }

        if (text_message.toLowerCase().includes(cityMatch[0])) {
          time_message = hours + ":" + minutes;
        } else {
          time_message =
            hours + ":" + minutes + " " + timeForm[2].toLowerCase();
        }
      } else if (regExpValidateTime.test(text_message)) {
        time_message = text_message
          .replace(regExpTimeMessage, ":")
          .substring(0, 5);
      } else if (regExpValidateTime2.test(text_message)) {
        if (text_message === "24") {
          time_message = "00:00";
        } else {
          time_message = text_message.match(/\d+/)[0] + ":00";
        }
      }
      if (cityMatch !== null) {
        timeZone = findCityName(cityMatch[1]);
        ctx.reply(`Опрос создан в группе - ${chat.title}`);
        stateMsg = "poll";
        const poll = await bot.telegram.sendPoll(
          chat.id,
          `${ctx.message.chat.username} хочет организовать созвон ${callDay} на ${time_message} по времени ${timeZone}`,
          optionsPool,
          { is_anonymous: false }
        );

        const chatId = String(Math.abs(chat.id)).slice(3);
        const chatTitle = chat.title;

        const hour = parseInt(time_message.split(":")[0], 10);
        const minute = parseInt(time_message.split(":")[1], 10);

        let optionsCron = {
          scheduled: true,
          timezone: timeZone,
        };

        cron.schedule(
          `${minute} ${hour} * * * `,
          async () => {
            for (let i = 0; i < callUsers.length; i++) {
              await bot.telegram.sendMessage(
                callUsers[i].id,
                `Заходи на созвон в группу <a href="https://t.me/c/${chatId}">${chatTitle}</a>`,
                {
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                }
              );
            }
            await ctx.telegram.deleteMessage(poll.chat.id, poll.message_id);
          },
          optionsCron
        );

        const timeToCall = (time) =>
          `Через ${time} у тебя созвон в группе <a href="https://t.me/c/${chatId}">${chatTitle}</a>`;

        cron.schedule(
          `${(minute - 5 + 60) % 60} ${minute >= 25 ? hour : hour - 1} * * * `,
          async () => {
            for (let i = 0; i < callUsers.length; i++) {
              await bot.telegram.sendMessage(
                callUsers[i].id,
                timeToCall("5 мин"),
                {
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                }
              );
            }
          },
          optionsCron
        );

        cron.schedule(
          `${(minute - 15 + 60) % 60} ${minute >= 15 ? hour : hour - 1} * * * `,
          async () => {
            for (let i = 0; i < callUsers.length; i++) {
              await bot.telegram.sendMessage(
                callUsers[i].id,
                timeToCall("15 мин"),
                {
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                }
              );
            }
          },
          optionsCron
        );

        cron.schedule(
          `${(minute - 30 + 60) % 60} ${minute >= 30 ? hour : hour - 1} * * * `,
          async () => {
            for (let i = 0; i < callUsers.length; i++) {
              await bot.telegram.sendMessage(
                callUsers[i].id,
                timeToCall("30 мин"),
                {
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                }
              );
            }
          },
          optionsCron
        );

        cron.schedule(
          `${minute} ${hour - 1} * * * `,
          async () => {
            for (let i = 0; i < callUsers.length; i++) {
              await bot.telegram.sendMessage(
                callUsers[i].id,
                timeToCall("час"),
                {
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                }
              );
            }
          },
          optionsCron
        );
        callDay = "сегодня";
        chat = {};
      } else {
        ctx.reply("Не валидное сообщение...");
      }
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
          "Во сколько ты хочешь организовать созвон?(формат ввода: XX.XX, XX,XX, XX:XX, XX XX, XX am|pm, XX:XX am|pm или XX по (город), например(по Киеву)"
        );
      } else {
        stateMsg = "poll";
        ctx.reply("Такого чата в базе не найдено!!!");
      }
    } else {
      ctx.reply("Не валидное сообщение...");
    }
  }
});

bot.launch();
