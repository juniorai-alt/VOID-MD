module.exports = {
    name: 'antidelete',
    alias: ['ad'],
    desc: 'Toggle antidelete',
    category: 'owner',
    async execute({ reply, args, isOwner, config, saveConfig }) {
        if (!isOwner) return reply('*Owner only* 💀')

        if (args[0] === 'on') {
            config.antidelete = true
            saveConfig()
            reply('*Antidelete ON* 💀\nBot will resend deleted messages')
        } else if (args[0] === 'off') {
            config.antidelete = false
            saveConfig()
            reply('*Antidelete OFF* 💀')
        } else {
            reply(`*Antidelete Status:* ${config.antidelete? 'ON ✅' : 'OFF ❌'}\n\nUse:.antidelete on/off`)
        }
    }
}
