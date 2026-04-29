const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'autoread',
    desc: 'Toggle auto read messages',
    execute: async ({ sock, m, from, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '📖', key: m.key } })

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.autoread = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Auto Read ON*\nBot will mark all messages as read')
        } else if (args[0] === 'off') {
            config.autoread = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Auto Read OFF*')
        } else {
            const status = config.autoread? 'ON ✅' : 'OFF ❌'
            await reply(`*AUTO READ STATUS:* ${status}\n\nUsage: ${PREFIX}autoread on/off`)
        }
    }
}
