module.exports = {
    name: 'autoread',
    alias: ['aread'],
    desc: 'Toggle auto read messages',
    category: 'owner',
    async execute({ reply, args, isOwner, config, saveConfig }) {
        if (!isOwner) return reply('*Owner only* 💀')

        if (args[0] === 'on') {
            config.autoread = true
            saveConfig()
            reply('*Autoread ON* 💀\nBot will mark all messages as read')
        } else if (args[0] === 'off') {
            config.autoread = false
            saveConfig()
            reply('*Autoread OFF* 💀')
        } else {
            reply(`*Autoread Status:* ${config.autoread? 'ON ✅' : 'OFF ❌'}\n\nUse:.autoread on/off`)
        }
    }
}
