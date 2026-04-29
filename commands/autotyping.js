const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'autotyping',
    alias: ['typing'],
    desc: 'Show typing indicator when processing commands',
    execute: async ({ sock, m, from, isOwner, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '⌨️', key: m.key } })
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.autotyping = true
            config.autorecording = false // Can't have both
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Auto Typing ON*\nBot shows "typing..." when running commands')
        } else if (args[0] === 'off') {
            config.autotyping = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Auto Typing OFF*')
        } else {
            const status = config.autotyping? 'ON ✅' : 'OFF ❌'
            await reply(`*AUTO TYPING STATUS:* ${status}\n\nUsage: ${PREFIX}autotyping on/off`)
        }
    }
}
