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
let callUsers = [];

bot.telegram.setMyCommands([
  {
    command: "/start",
    description: "Начать бота и получать напоминания от него",
  },
  {
    command: "/allconnects",
    description:
      "Получить всех пользователей и все групы, которые подключены к этому боту(Команда для админов)",
  },
  {
    command: "/getpollusers",
    description: "Получить всех пользователей, которые будут на созвоне",
  },
  {
    command: "/leave",
    description: "Выйти с напоминания о созвоне",
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
const regExpValidateTime2 = /^([01]?[0-9]|2[0-4])$/;
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
const weekdaysMap = {
  понедельник: 1,
  вторник: 2,
  среду: 3,
  четверг: 4,
  пятницу: 5,
  субботу: 6,
  воскресенье: 0,
};

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
    `Привет👋, это бот🤖 для того, чтобы помочь людям созваниваться в группах📞...
    Формат создания опросов - " (какой-то текст) (завтра, сегодня, в суботту и т. д., этот параметр может быть в любом месте сообщения, а может и вообще его не быть - тогда по умолчанию будет "сегодня") в чате (Название чата)"
    Пример сообщения - "Я хочу организовать созвон завтра в чате Бот для созвонов"`
  );
  fs.writeFileSync("database/db.json", JSON.stringify(newChats));
});

bot.hears(["/allconnects", "/allconnects@calls_our_bot"], checkUser, (ctx) => {
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

bot.hears(["/leave", "/leave@calls_our_bot"], (ctx) => {
  if (ctx.message.chat.type === "private" && ctx.message.text !== "/start") {
    if (callUsers.find((chat) => chat.id === ctx.chat.id)) {
      callUsers = callUsers.filter((chat) => chat.id !== ctx.chat.id);
      ctx.reply("Ты успешно вышел из напоминания о созвоне!");
      console.log(callUsers);
    } else {
      ctx.reply("Уппс, ты не состоишь в напоминании о созвоне!");
    }
  } else if (ctx.message.chat.type !== "private") {
    ctx.reply(
      "Уупсс..., эту команду нужно использовать только в личных сообщениях)))"
    );
  }
});

bot.on("poll_answer", (ctx) => {
  const { id, username, first_name } = ctx.update.poll_answer.user;
  let option_id = ctx.update.poll_answer.option_ids[0];

  if (option_id === 0) {
    callUsers.push({ id: id, username: username, first_name: first_name });
    bot.telegram.sendMessage(
      id,
      `Спасибо за ваш ответ. За 1 час, 30, 15 и 5 минут до созвона наш бот уведомит вас!!!`
    );
  }
});

bot.hears(["/getpollusers", "/getpollusers@calls_our_bot"], (ctx) => {
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

  if (
    ctx.message.chat.type === "private" &&
    ctx.message.text !== "/start" &&
    ctx.message.text !== "/leave"
  ) {
    const time_msg = text_message.split(" по")[0];
    if (
      regExpValidateTime.test(time_msg) ||
      (regExpValidateTime2.test(time_msg) && stateMsg === "time")
    ) {
      let time_message;
      if (regExpTimePmAm.test(time_msg)) {
        let time = time_msg.slice(0, 2);
        let timeForm = time_msg.match(regExpTimePmAm);
        let hours = Number(time);
        let minutes = timeForm[1] === undefined ? "00" : timeForm[1].slice(1);

        if (hours < 10) {
          hours = "0" + hours;
          hours = Number(hours);
        }

        if (timeForm[2].toLowerCase() === "pm" && hours !== 12) {
          hours += 12;
        }

        if (time_msg.toLowerCase().includes(cityMatch[0])) {
          time_message = hours + ":" + minutes;
        } else {
          time_message =
            hours + ":" + minutes + " " + timeForm[2].toLowerCase();
        }
      } else if (regExpValidateTime.test(time_msg)) {
        time_message = time_msg.replace(regExpTimeMessage, ":").substring(0, 5);
      } else if (regExpValidateTime2.test(time_msg)) {
        if (time_msg === "24") {
          time_message = "00:00";
        } else {
          time_message = time_msg.match(/\d+/)[0] + ":00";
        }
      }
      if (cityMatch !== null) {
        timeZone = findCityName(cityMatch[1]);
      } else {
        timeZone = "Europe/Kyiv";
      }
      if (timeZone !== null) {
        ctx.reply(`Опрос создан в группе - ${chat.title}`);
        stateMsg = "poll";
        const poll = await bot.telegram.sendPoll(
          chat.id,
          `${
            ctx.message.chat.username
          } хочет организовать созвон ${callDay.toLowerCase()} на ${time_message} по времени ${timeZone}`,
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

        const timeToCall = (time) =>
          `Через ${time} у тебя созвон в группе <a href="https://t.me/c/${chatId}">${chatTitle}</a>`;

        function cronMessage(
          minute,
          hour,
          dayOfWeek,
          indexOfDay,
          message,
          callUsersArr,
          poll,
          finalMessage
        ) {
          cron.schedule(
            `${minute} ${hour} ${dayOfWeek} * ${indexOfDay}`,
            async () => {
              console.log(callUsers);
              for (let i = 0; i < callUsers.length; i++) {
                await bot.telegram.sendMessage(callUsers[i].id, message, {
                  parse_mode: "HTML",
                  disable_web_page_preview: true,
                });
              }
              if (finalMessage) {
                await ctx.telegram.deleteMessage(poll.chat.id, poll.message_id);
                callUsers = [];
              }
            },
            optionsCron
          );
        }

        if (callDay.toLowerCase() === "завтра") {
          cronMessage(
            minute,
            hour,
            new Date().getDate() + 1,
            "*",
            `Заходи на созвон в группу <a href="https://t.me/c/${chatId}">${chatTitle}</a>`,
            callUsers,
            poll,
            true
          );
          cronMessage(
            (minute - 5 + 60) % 60,
            minute >= 25 ? hour : hour - 1,
            new Date().getDate() + 1,
            "*",
            timeToCall("5 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            (minute - 15 + 60) % 60,
            minute >= 15 ? hour : hour - 1,
            new Date().getDate() + 1,
            "*",
            timeToCall("15 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            (minute - 30 + 60) % 60,
            minute >= 30 ? hour : hour - 1,
            new Date().getDate() + 1,
            "*",
            timeToCall("30 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            minute,
            hour - 1,
            new Date().getDate() + 1,
            "*",
            timeToCall("час"),
            callUsers,
            poll,
            false
          );
        } else if (
          callDay.toLowerCase() !== "сегодня" &&
          callDay.toLowerCase() !== "завтра"
        ) {
          const indexDay = weekdaysMap[callDay.toLowerCase().slice(2)];
          cronMessage(
            minute,
            hour,
            "*",
            indexDay,
            `Заходи на созвон в группу <a href="https://t.me/c/${chatId}">${chatTitle}</a>`,
            callUsers,
            poll,
            true
          );
          cronMessage(
            (minute - 5 + 60) % 60,
            minute >= 25 ? hour : hour - 1,
            "*",
            indexDay,
            timeToCall("5 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            (minute - 15 + 60) % 60,
            minute >= 15 ? hour : hour - 1,
            "*",
            indexDay,
            timeToCall("15 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            (minute - 30 + 60) % 60,
            minute >= 30 ? hour : hour - 1,
            "*",
            indexDay,
            timeToCall("30 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            minute,
            hour - 1,
            "*",
            indexDay,
            timeToCall("час"),
            callUsers,
            poll,
            false
          );
        } else {
          cronMessage(
            minute,
            hour,
            "*",
            "*",
            `Заходи на созвон в группу <a href="https://t.me/c/${chatId}">${chatTitle}</a>`,
            callUsers,
            poll,
            true
          );
          cronMessage(
            (minute - 5 + 60) % 60,
            minute >= 25 ? hour : hour - 1,
            "*",
            "*",
            timeToCall("5 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            (minute - 15 + 60) % 60,
            minute >= 15 ? hour : hour - 1,
            "*",
            "*",
            timeToCall("15 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            (minute - 30 + 60) % 60,
            minute >= 30 ? hour : hour - 1,
            "*",
            "*",
            timeToCall("30 мин"),
            callUsers,
            poll,
            false
          );
          cronMessage(
            minute,
            hour - 1,
            "*",
            "*",
            timeToCall("час"),
            callUsers,
            poll,
            false
          );
        }
        callDay = "сегодня";
        chat = {};
      } else {
        ctx.reply("Не валидное сообщение...");
      }
    } else if (regExpTime.test(time_msg) || regExpTime2.test(time_msg)) {
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
