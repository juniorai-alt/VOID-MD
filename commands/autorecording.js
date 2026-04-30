module.exports = {
    name: 'autorecording',
    alias: ['ar'],
    desc: 'Toggle recording on all messages',
    category: 'owner',
    async execute({ reply, args, isOwner, config, saveConfig }) {
        if (!isOwner) return reply('*Owner only* 💀')

        if (args[0] === 'on') {
            config.autorecording = true
            config.autotyping = false
            config.autonline = false
            saveConfig()
            reply('*Autorecording ON* 💀\nBot shows recording for 3sec on every message')
        } else if (args[0] === 'off') {
            config.autorecording = false
            saveConfig()
            reply('*Autorecording OFF* 💀')
        } else {
            reply(`*Autorecording Status:* ${config.autorecording? 'ON ✅' : 'OFF ❌'}\n\nUse:.autorecording on/off`)
        }
    }
}
