const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'antidelete',
    alias: ['antidel'],
    desc: 'Recover deleted messages',
    execute: async ({ sock, m, from, isOwner, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '🗑️', key: m.key } })
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.antidelete = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Anti Delete ON*\nDeleted messages will be recovered')
        } else if (args[0] === 'off') {
            config.antidelete = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Anti Delete OFF*')
        } else {
            const status = config.antidelete? 'ON ✅' : 'OFF ❌'
            await reply(`*ANTIDELETE STATUS:* ${status}\n\nUsage: ${PREFIX}antidelete on/off`)
        }
    }
}
