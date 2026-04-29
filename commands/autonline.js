const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'autonline',
    alias: ['online', 'alwaysonline'],
    desc: 'Show bot as online 24/7',
    execute: async ({ sock, m, from, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '🟢', key: m.key } })

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.autonline = true
            config.autotyping = false
            config.autorecording = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await sock.sendPresenceUpdate('available')
            await reply('✅ *Auto Online ON*\nBot now shows "online" 24/7\n\n⚠️ Disables auto typing/recording')
        } else if (args[0] === 'off') {
            config.autonline = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await sock.sendPresenceUpdate('unavailable')
            await reply('❌ *Auto Online OFF*\nBot goes offline when idle')
        } else {
            const status = config.autonline? 'ON ✅' : 'OFF ❌'
            await reply(`*AUTO ONLINE STATUS:* ${status}\n\nUsage: ${PREFIX}autonline on/off`)
        }
    }
}
