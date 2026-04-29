const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'welcome',
    desc: 'Toggle welcome messages on/off',
    execute: async ({ sock, m, from, isGroup, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '👋', key: m.key } })
        if (!isGroup) return reply('Group only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.welcome = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Welcome Messages ON*\nBot will greet new members')
        } else if (args[0] === 'off') {
            config.welcome = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Welcome Messages OFF*')
        } else {
            const status = config.welcome? 'ON ✅' : 'OFF ❌'
            await reply(`*WELCOME STATUS:* ${status}\n\nUsage: ${PREFIX}welcome on/off`)
        }
    }
}
