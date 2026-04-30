module.exports = {
    name: 'antilink',
    alias: ['al'],
    desc: 'Toggle antilink',
    category: 'owner',
    async execute({ reply, args, isOwner, config, saveConfig, isGroup }) {
        if (!isOwner) return reply('*Owner only* 💀')
        if (!isGroup) return reply('*Group only command* 💀')

        if (args[0] === 'on') {
            config.antilink = true
            saveConfig()
            reply('*Antilink ON* 💀\nBot will kick users who send group links\n*Note:* Bot must be admin')
        } else if (args[0] === 'off') {
            config.antilink = false
            saveConfig()
            reply('*Antilink OFF* 💀')
        } else {
            reply(`*Antilink Status:* ${config.antilink? 'ON ✅' : 'OFF ❌'}\n\nUse:.antilink on/off`)
        }
    }
}
