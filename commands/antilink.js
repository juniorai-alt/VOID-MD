const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'antilink',
    desc: 'Toggle antilink on/off - kicks users who send links',
    execute: async ({ sock, m, from, isGroup, isOwner, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '🔗', key: m.key } })
        if (!isGroup) return reply('Group only')
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.antilink = true
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Antilink ON*\nUsers sending group links will be kicked\n\n⚠️ Bot must be admin')
        } else if (args[0] === 'off') {
            config.antilink = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Antilink OFF*')
        } else {
            const status = config.antilink? 'ON ✅' : 'OFF ❌'
            await reply(`*ANTILINK STATUS:* ${status}\n\nUsage: ${PREFIX}antilink on/off`)
        }
    }
}
