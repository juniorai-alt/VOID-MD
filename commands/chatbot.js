const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'chatbot',
    desc: 'Toggle chatbot - auto reply to mentions',
    execute: async ({ sock, m, from, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '🤖', key: m.key } })

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.chatbot = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Chatbot ON*\nBot will auto-reply when mentioned')
        } else if (args[0] === 'off') {
            config.chatbot = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Chatbot OFF*')
        } else {
            const status = config.chatbot? 'ON ✅' : 'OFF ❌'
            await reply(`*CHATBOT STATUS:* ${status}\n\nUsage: ${PREFIX}chatbot on/off`)
        }
    }
}
