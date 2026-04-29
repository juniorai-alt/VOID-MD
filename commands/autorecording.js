const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'autorecording',
    alias: ['recording', 'autorec'],
    desc: 'Show recording indicator when processing commands',
    execute: async ({ sock, m, from, isOwner, args, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '🎙️', key: m.key } })
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        if (args[0] === 'on') {
            config.autorecording = true
            config.autotyping = false // Can't have both
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('✅ *Auto Recording ON*\nBot shows "recording audio..." when running commands')
        } else if (args[0] === 'off') {
            config.autorecording = false
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
            await reply('❌ *Auto Recording OFF*')
        } else {
            const status = config.autorecording? 'ON ✅' : 'OFF ❌'
            await reply(`*AUTO RECORDING STATUS:* ${status}\n\nUsage: ${PREFIX}autorecording on/off`)
        }
    }
}
