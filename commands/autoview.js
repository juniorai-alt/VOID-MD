const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'autoview',
    desc: 'Toggle auto view status',
    execute: async ({ sock, m, from, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '👁️', key: m.key } })

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.autoview = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Auto View Status ON*\nBot will auto-view all statuses')
        } else if (args[0] === 'off') {
            config.autoview = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Auto View Status OFF*')
        } else {
            const status = config.autoview? 'ON ✅' : 'OFF ❌'
            await reply(`*AUTO VIEW STATUS:* ${status}\n\nUsage: ${PREFIX}autoview on/off`)
        }
    }
}
