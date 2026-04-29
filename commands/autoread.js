const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'autoread',
    desc: 'Toggle auto read messages on/off',
    execute: async ({ sock, m, from, isOwner, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '👀', key: m.key } })
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.autoread = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Auto Read ON*\nBot marks all messages as read')
        } else if (args[0] === 'off') {
            config.autoread = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Auto Read OFF*')
        } else {
            const status = config.autoread? 'ON ✅' : 'OFF ❌'
            await reply(`*AUTOREAD STATUS:* ${status}\n\nUsage: ${PREFIX}autoread on/off`)
        }
    }
}
