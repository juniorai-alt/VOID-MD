const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'chatbot',
    alias: ['aichat', 'ai'],
    desc: 'Toggle AI chat mode - bot replies when mentioned',
    execute: async ({ sock, m, from, isOwner, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '🤖', key: m.key } })
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.chatbot = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *ChatBot ON*\nMention me or reply to my messages to chat\n\nExample: @bot sup')
        } else if (args[0] === 'off') {
            config.chatbot = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *ChatBot OFF*')
        } else {
            const status = config.chatbot? 'ON ✅' : 'OFF ❌'
            await reply(`*CHATBOT STATUS:* ${status}\n\nUsage: ${PREFIX}chatbot on/off`)
        }
    }
}
