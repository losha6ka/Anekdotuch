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
bot.setMyCommands([
    { command: "/start", description: "Приветствие" },
    { command: "/copytext", description: "Найти анекдот на сайте" },
    { command: "/update", description: "Получить анекдот из заранее заготовленных ссылок" },
    { command: "/changetagp", description: "Сменить поиск по тегу <p>" },
    { command: "/changetagdiv", description: "Сменить поиск по тегу <div>" },
    { command: "/changetagli", description: "Сменить поиск по тегу <li>" },
    { command: "/add", description: "Добавить анекдот" }
]);
async function sendTextToChannel(chatId, text) {
    const channelId = "@anekdotkesha";

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
        bot.sendMessage(chatId, 'Привет! Я бот, который может скопировать анекдоты.', copyOptions);
    } else {
        bot.sendMessage(chatId, 'Извините, вы не имеете доступа к этой команде.');
        console.log(userId)
    }
});
// Добавьте команды для смены тега поиска
bot.onText(/\/changetagp/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize state as an empty object if it doesn't exist in tagMap
    const state = tagMap.get(chatId) || {};
    state.searchTag = 'p'; // Set the searchTag property
    tagMap.set(chatId, state);

    bot.sendMessage(chatId, 'Now I will search using the <p> tag.');
});
bot.onText(/\/changetagdiv/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize state as an empty object if it doesn't exist in tagMap
    const state = tagMap.get(chatId) || {};
    state.searchTag = 'div'; // Set the searchTag property
    tagMap.set(chatId, state);

    bot.sendMessage(chatId, 'Now I will search using the <div> tag.');
});
bot.onText(/\/changetagli/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize state as an empty object if it doesn't exist in tagMap
    const state = tagMap.get(chatId) || {};
    state.searchTag = 'li'; // Set the searchTag property
    tagMap.set(chatId, state);

    bot.sendMessage(chatId, 'Now I will search using the <li> tag.');
});
bot.onText(/\/update/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUsers.includes(userId)) {
        const state = conversationMap.get(chatId) || {}; // Initialize state

        // Rest of your code remains the same
        const savedLinks = [
            "https://anekdoty.ru/"
            // Добавьте больше заготовленных ссылок, если необходимо
        ];

        if (savedLinks.length > 0) {
            // Выберите случайную заготовленную ссылку
            const randomLink = savedLinks[Math.floor(Math.random() * savedLinks.length)];

            try {
                const response = await fetch(randomLink);
                const html = await response.text();
                const $ = cheerio.load(html);
                const paragraphs = [];
                const searchTag = state.searchTag || 'p'; // По умолчанию ищем по тегу <p>
                // Менять строки в зависимости от структуры сайта:
                $(searchTag).each((index, element) => {
                    const paragraphText = $(element).text().trim();
                    if (paragraphText !== '') {
                        paragraphs.push(paragraphText);
                    }
                });
                if (paragraphs.length > 0) {
                    // Выберите случайный параграф
                    const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];

                    // Отправьте полученный текст в чат
                    bot.sendMessage(chatId, randomParagraph);
                    const keyboard = {
                        reply_markup: {
                            keyboard: [[{ text: "/add" }]],
                            one_time_keyboard: true,
                        },
                    };
                    await bot.sendMessage(chatId, 'Добавить анекдот /add', keyboard);
                    // Сохраните полученный текст в состояние
                    const state = conversationMap.get(chatId) || {};
                    state.copiedText = randomParagraph;
                    conversationMap.set(chatId, state);
                } else {
                    bot.sendMessage(chatId, 'Ошибка: не удалось найти текст на выбранной ссылке.');
                }
            } catch (error) {
                console.error(`Произошла ошибка: ${error.message}`);
                bot.sendMessage(chatId, `Произошла ошибка: ${error.message}`);
            }
        } else {
            bot.sendMessage(chatId, 'Извините, нет доступных заготовленных ссылок.');
        }
    } else {
        bot.sendMessage(chatId, 'Извините, вы не имеете доступа к этой команде.');
    }
});
bot.onText(/\/add/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUsers.includes(userId)) {
        const state = conversationMap.get(chatId) || {};
        const { copiedText } = state;

        if (copiedText) {
            // Отправьте анекдот в канал вместо "moreinformation"
            sendTextToChannel(chatId, copiedText)
                .then(() => {
                    const keyboard = {
                        reply_markup: {
                            keyboard: [[{ text: "/add" }]],
                            one_time_keyboard: true,
                        },
                    };
                    return bot.sendMessage(chatId, 'Добавить анекдот /add', keyboard);
                });
        } else {
            bot.sendMessage(chatId, 'Сначала отправьте URL, затем используйте /add для добавления.');
        }
    } else {
        bot.sendMessage(chatId, 'Извините, вы не имеете доступа к этой команде.');
    }
});
bot.onText(/\/copytext/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (allowedUsers.includes(userId)) {
        const state = conversationMap.get(chatId) || {};
        state.stage = 'awaiting_url';
        state.copiedText = ''; // Инициализируйте свойство copiedText
        conversationMap.set(chatId, state);

        bot.sendMessage(chatId, 'Пожалуйста, отправьте URL сайта.');
    } else {
        bot.sendMessage(chatId, 'Извините, вы не имеете доступа к этой команде.');
    }
});
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === '/copytext') {
        const state = conversationMap.get(chatId) || {};
        state.stage = 'awaiting_url';
        conversationMap.set(chatId, state);

        bot.sendMessage(chatId, 'Пожалуйста, отправьте URL.');
    }
});
bot.on('text', async (msg) => {
    const chatId = msg.chat.id;
    const state = conversationMap.get(chatId) || {};
    const { stage } = state;

    if (stage === 'awaiting_url') {
        const url = msg.text;

        try {
            const response = await fetch(url);
            const html = await response.text();
            const $ = cheerio.load(html);
            const paragraphs = [];
            const searchTag = state.searchTag || 'p'; // По умолчанию ищем по тегу <p>
            // Менять строки в зависимости от сайта:
            $(searchTag).each((index, element) => {   // или  $('div').each((index, element) => { 
                const paragraphText = $(element).text().trim();
                if (paragraphText !== '') {
                    paragraphs.push(paragraphText);
                }
            });

            if (paragraphs.length > 0) {
                // Выберите случайный параграф
                const randomParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
                state.copiedText = randomParagraph; // Сохраните скопированный текст

                if (randomParagraph.length > MAX_MESSAGE_LENGTH) {
                    // Обработайте длинные абзацы, как вы делали ранее
                } else {
                    const paragraphWithMention = `${randomParagraph}\n@anekdotkesha`;
                    await bot.sendMessage(chatId, paragraphWithMention).then((message) => {
                        state.lastMessageId = message.message_id;
                    });

                    // Теперь отправьте кнопку /add
                    const keyboard = {
                        reply_markup: {
                            keyboard: [[{ text: "/add" }]],
                            one_time_keyboard: true,
                        },
                    };
                    await bot.sendMessage(chatId, 'Добавить анекдот /add', keyboard);
                }
            } else {
                bot.sendMessage(chatId, 'Ошибка.');
            }
        } catch (error) {
            bot.sendMessage(chatId, `Произошла ошибка: ${error.message}`);
        } finally {
            conversationMap.set(chatId, state); // Обновите состояние разговора
        }
    }
});
