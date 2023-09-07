const { copyOptions } = require("./options")
const TelegramApi = require("node-telegram-bot-api")
const token = "6571997802:AAGB92HL7nYlA1GtfW8oNPP10zPOtAPrdDg"
const bot = new TelegramApi(token, { polling: true })
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const MAX_MESSAGE_LENGTH = 4096;
const conversationMap = new Map();
const tagMap = new Map();
const allowedUsers = [456141628, 709027639];
const cron = require("node-cron"); // Импортируем библиотеку node-cron
const fs = require('fs');
const sentJokesSet = new Set();
let isSending = false; // Флаг для отслеживания выполняется ли отправка в данный момент
const healthchecksIoUrl = 'https://hc-ping.com/7ad798ca-442b-4e17-bf98-cce3df4a1818';

const allLinks = [
    "https://anekdoty.ru/",
    "https://anekdoty.ru/cherniy-yumor/",
    "https://anekdoty.ru/pro-armyan/",
    "https://anekdoty.ru/pro-gruzinov/",
    "https://anekdoty.ru/pro-mobilizaciyu/",
    "https://anekdoty.ru/pro-programmistov/",
    "https://anekdoty.ru/pro-vzroslyh/",
    "https://anekdoty.ru/detskie/",
    "https://anekdoty.ru/pro-evreev/",
    "https://anekdoty.ru/pro-invalidov/",
    "https://anekdoty.ru/pro-narkomanov/",
    "https://anekdoty.ru/pro-seks/",
    "https://anekdoty.ru/korotkie/",
    "https://anekdoty.ru/pro-geev/",
    "https://anekdoty.ru/pro-klounov/",
    "https://anekdoty.ru/pro-negrov/",
    "https://anekdoty.ru/pro-shtirlica/",
    "https://anekdoty.ru/samye-smeshnye/",
    "https://anekdoty.ru/pro-seks/",
    "https://anekdoty.ru/poshlye-anekdoty/",
    "https://anekdoty.ru/pro-gitlera/",
    "https://anekdoty.ru/pro-mamu/",
    "https://anekdoty.ru/pro-podrostkov/",
    "https://anekdoty.ru/tupo-no-smeshno/",
    "https://anekdoty.ru/pro-zhenu/"
];
function loadSentJokes() {
    try {
        const data = fs.readFileSync("sent_jokes.json", "utf8");
        const parsedData = JSON.parse(data);
        return new Set(parsedData); // Преобразовать массив в Set
    } catch (error) {
        return new Set(); // Создать новое пустое множество, если файл не существует
    }
}
function saveSentJokes(sentJokes) {
    try {
        const existingSentJokes = loadSentJokes(); // Загрузить существующие анекдоты из файла
        const combinedSentJokes = new Set([...existingSentJokes, ...sentJokes]); // Объединить существующие и новые анекдоты
        fs.writeFileSync("sent_jokes.json", JSON.stringify(Array.from(combinedSentJokes), null, 2));
    } catch (error) {
        console.error(`Произошла ошибка при сохранении анекдотов: ${error.message}`);
    }
}
const sentJokes = loadSentJokes();
bot.setMyCommands([
    { command: "/start", description: "Приветствие" },
    { command: "/copytext", description: "Найти анекдот на сайте" },
    { command: "/update", description: "Получить анекдот из заранее заготовленных ссылок" },
    { command: "/changetagp", description: "Сменить поиск по тегу <p>" },
    { command: "/changetagdiv", description: "Сменить поиск по тегу <div>" },
    { command: "/changetagli", description: "Сменить поиск по тегу <li>" },
    { command: "/add", description: "Добавить анекдот" },
]);
async function sendTextToChannel(chatId, text) {
    const channelId = "@anekdotkesha"; // Замените на ваш канал
    try {
        await bot.sendMessage(channelId, `${text}\n@anekdotkesha`);
    } catch (error) {
        bot.sendMessage(chatId, `Произошла ошибка при добавлении сообщения в канал: ${error.message}`);
    }
}
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUsers.includes(userId)) {
        bot.sendMessage(chatId, "Привет! Я бот, который может скопировать анекдоты.", copyOptions);
    } else {
        bot.sendMessage(chatId, "Извините, вы не имеете доступа к этой команде.");
    }
});
bot.onText(/\/changetagp/, (msg) => {
    const chatId = msg.chat.id;
    const state = tagMap.get(chatId) || {};
    state.searchTag = "p";
    tagMap.set(chatId, state);
    bot.sendMessage(chatId, "Теперь я буду искать используя тег <p>.");
});
bot.onText(/\/changetagdiv/, (msg) => {
    const chatId = msg.chat.id;
    const state = tagMap.get(chatId) || {};
    state.searchTag = "div";
    tagMap.set(chatId, state);
    bot.sendMessage(chatId, "Теперь я буду искать используя тег <div>.");
});
bot.onText(/\/changetagli/, (msg) => {
    const chatId = msg.chat.id;
    const state = tagMap.get(chatId) || {};
    state.searchTag = "li";
    tagMap.set(chatId, state);
    bot.sendMessage(chatId, "Теперь я буду искать используя тег <li>.");
});
bot.onText(/\/update/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUsers.includes(userId)) {
        const state = conversationMap.get(chatId) || {};
        const savedLinks = allLinks

        if (savedLinks.length > 0) {
            try {
                const randomLink = savedLinks[Math.floor(Math.random() * savedLinks.length)];
                const response = await fetch(randomLink);
                const html = await response.text();
                const $ = cheerio.load(html);
                const paragraphs = [];
                const tagState = tagMap.get(chatId);
                const searchTag = (tagState && tagState.searchTag) || "p";


                $(searchTag).each((index, element) => {
                    const paragraphText = $(element).text().trim();
                    if (paragraphText !== "") {
                        paragraphs.push(paragraphText);
                    }
                });
                if (paragraphs.length > 0) {
                    const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
                    if (!sentJokesSet.has(randomParagraph)) {
                        // Анекдот ещё не был отправлен, поэтому отправляем его
                        bot.sendMessage(chatId, randomParagraph);
                        const keyboard = {
                            reply_markup: {
                                keyboard: [[{ text: "/add" }]],
                                one_time_keyboard: true,
                            },
                        };
                        await bot.sendMessage(chatId, "Добавить анекдот /add", keyboard);

                        sentJokesSet.add(randomParagraph); // Добавьте анекдот в множество отправленных анекдотов
                        saveSentJokes(sentJokesSet); // Сохраните обновленный список анекдотов

                        state.copiedText = randomParagraph;
                        conversationMap.set(chatId, state);
                    } else {
                        // Анекдот уже был отправлен, выполните другое действие или просто игнорируйте его
                        console.log("Анекдот уже был отправлен: ", randomParagraph);
                    }
                } else {
                    bot.sendMessage(chatId, "Ошибка: не удалось найти текст на выбранной ссылке.");
                }
            } catch (error) {
                console.error(`Произошла ошибка: ${error.message}`);
                bot.sendMessage(chatId, `Произошла ошибка: ${error.message}`);
            }
        } else {
            bot.sendMessage(chatId, "Извините, нет доступных заготовленных ссылок.");
        }
    } else {
        bot.sendMessage(chatId, "Извините, вы не имеете доступа к этой команде.");
    }
});
bot.onText(/\/add/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUsers.includes(userId)) {
        const state = conversationMap.get(chatId) || {};
        const { copiedText } = state;

        if (copiedText) {
            sendTextToChannel(chatId, copiedText)
                .then(() => {
                    const keyboard = {
                        reply_markup: {
                            keyboard: [[{ text: "/add" }]],
                            one_time_keyboard: true,
                        },
                    };
                    return bot.sendMessage(chatId, "Добавить анекдот /add", keyboard);
                });
        } else {
            bot.sendMessage(chatId, "Сначала отправьте URL, затем используйте /add для добавления.");
        }
    } else {
        bot.sendMessage(chatId, "Извините, вы не имеете доступа к этой команде.");
    }
});
bot.onText(/\/copytext/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUsers.includes(userId)) {
        const state = conversationMap.get(chatId) || {};
        state.stage = "awaiting_url";
        state.copiedText = "";
        conversationMap.set(chatId, state);

        bot.sendMessage(chatId, "Пожалуйста, отправьте URL сайта.");
    } else {
        bot.sendMessage(chatId, "Извините, вы не имеете доступа к этой команде.");
    }
});
bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === "/copytext") {
        const state = conversationMap.get(chatId) || {};
        state.stage = "awaiting_url";
        state.copiedText = "";
        conversationMap.set(chatId, state);

        bot.sendMessage(chatId, "Пожалуйста, отправьте URL сайта.");
    }
});
bot.on("text", async (msg) => {
    const chatId = msg.chat.id;
    const state = conversationMap.get(chatId) || {};
    const { stage } = state;

    if (stage === "awaiting_url") {
        const url = msg.text;

        try {
            const response = await fetch(url);
            const html = await response.text();
            const $ = cheerio.load(html);
            const paragraphs = [];
            const tagState = tagMap.get(chatId);
            const searchTag = (tagState && tagState.searchTag) || "p";


            $(searchTag).each((index, element) => {
                const paragraphText = $(element).text().trim();
                if (paragraphText !== "") {
                    paragraphs.push(paragraphText);
                }
            });

            if (paragraphs.length > 0) {
                const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
                state.copiedText = randomParagraph;

                if (randomParagraph.length > MAX_MESSAGE_LENGTH) {
                    // Обработайте длинные абзацы, как вы делали ранее
                } else {
                    const paragraphWithMention = `${randomParagraph}\n@anekdotkesha`;
                    await bot.sendMessage(chatId, paragraphWithMention).then((message) => {
                        state.lastMessageId = message.message_id;
                    });

                    const keyboard = {
                        reply_markup: {
                            keyboard: [[{ text: "/add" }]],
                            one_time_keyboard: true,
                        },
                    };
                    await bot.sendMessage(chatId, "Добавить анекдот /add", keyboard);
                }
            } else {
                bot.sendMessage(chatId, "Ошибка: не удалось найти текст на выбранной ссылке.");
            }
        } catch (error) {
            bot.sendMessage(chatId, `Произошла ошибка: ${error.message}`);
        } finally {
            conversationMap.set(chatId, state);
        }
    }
});
cron.schedule("0 */2 * * *", async () => {
    if (isSending) {
        console.log("Предыдущая отправка ещё не завершена, пропускаем этот запуск.");
        return;
    }

    isSending = true; // Устанавливаем флаг, что отправка началась

    const savedLinks = allLinks;

    try {
        const randomLink = savedLinks[Math.floor(Math.random() * savedLinks.length)];
        const response = await fetch(randomLink);
        const html = await response.text();
        const $ = cheerio.load(html);
        const paragraphs = [];
        const chatId = "@anekdotkesha";
        const tagState = tagMap.get(chatId);
        const searchTag = (tagState && tagState.searchTag) || "p";

        $(searchTag).each((index, element) => {
            const paragraphText = $(element).text().trim();
            if (paragraphText !== "") {
                paragraphs.push(paragraphText);
            }
        });

        if (paragraphs.length > 0) {
            const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
            if (!sentJokesSet.has(randomParagraph)) {
                // Анекдот ещё не был отправлен, поэтому отправляем его
                await bot.sendMessage(chatId, `${randomParagraph}\n@anekdotkesha`);

                sentJokesSet.add(randomParagraph); // Добавьте анекдот в множество отправленных анекдотов
                saveSentJokes(sentJokesSet); // Сохраните обновленный список анекдотов

                // Здесь создайте объект 'state', как это делается в обработчике команды /update
                const state = {
                    copiedText: randomParagraph
                };

                conversationMap.set(chatId, state);
            } else {
                // Анекдот уже был отправлен, выполните другое действие или просто игнорируйте его
                console.log("Анекдот уже был отправлен: ", randomParagraph);
            }
        } else {
            console.error("Ошибка: не удалось найти текст на выбранной ссылке.");
        }
    } catch (error) {
        console.error(`Произошла ошибка: ${error.message}`);
    }

    isSending = false; // Сбрасываем флаг после завершения отправки
});
bot.on("polling_error", (error) => {
    console.error(`Произошла ошибка в polling: ${error.message}`);
});
// Функция для отправки запроса к Healthchecks.io
async function pingHealthchecksIo() {
    try {
        const response = await fetch(healthchecksIoUrl);
        if (response.status === 200) {
            console.log('Запрос успешно отправлен на Healthchecks.io');
        } else {
            console.error('Произошла ошибка при отправке запроса на Healthchecks.io:', response.statusText);
        }
    } catch (error) {
        console.error('Произошла ошибка при отправке запроса на Healthchecks.io:', error.message);
    }
}
// Запустите функцию каждую минуту (или другой интервал, который вам нужен)
setInterval(pingHealthchecksIo, 60000); // 60000 миллисекунд = 1 минута
console.log("Бот запущен");