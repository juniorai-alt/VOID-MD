const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'autoview',
    alias: ['autostatusview'],
    desc: 'Auto view all WhatsApp statuses',
    execute: async ({ sock, m, from, isOwner, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '👁️', key: m.key } })
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.autoview = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Auto View Status ON*\nAll statuses will be marked as seen')
        } else if (args[0] === 'off') {
            config.autoview = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Auto View Status OFF*')
        } else {
            const status = config.autoview? 'ON ✅' : 'OFF ❌'
            await reply(`*AUTOVIEW STATUS:* ${status}\n\nUsage: ${PREFIX}autoview on/off`)
        }
    }
}
