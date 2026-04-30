module.exports = {
    name: 'autoview',
    alias: ['av'],
    desc: 'Toggle auto status view + react',
    category: 'owner',
    async execute({ reply, args, isOwner, config, saveConfig }) {
        if (!isOwner) return reply('*Owner only* 💀')

        if (args[0] === 'on') {
            config.autoview = true
            saveConfig()
            reply('*Autoview + React ON* 💀\nBot will view and react to all statuses')
        } else if (args[0] === 'off') {
            config.autoview = false
            saveConfig()
            reply('*Autoview OFF* 💀')
        } else {
            reply(`*Autoview Status:* ${config.autoview? 'ON ✅' : 'OFF ❌'}\n\nUse:.autoview on/off`)
        }
    }
}
