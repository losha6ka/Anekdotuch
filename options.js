module.exports = {
    copyOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: "Найти анекдот", callback_data: "/copytext" }]
            ]
        })
    },
    addOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{ text: "Добавить в канал", callback_data: "/add" }]
            ]
        })
    }
}