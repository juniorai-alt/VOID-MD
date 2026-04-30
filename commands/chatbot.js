module.exports = {
    name: 'chatbot',
    alias: ['cb'],
    desc: 'Toggle chatbot auto reply',
    category: 'owner',
    async execute({ reply, args, isOwner, config, saveConfig }) {
        if (!isOwner) return reply('*Owner only* 💀')

        if (args[0] === 'on') {
            config.chatbot = true
            saveConfig()
            reply('*Chatbot ON* 💀\nBot replies when tagged')
        } else if (args[0] === 'off') {
            config.chatbot = false
            saveConfig()
            reply('*Chatbot OFF* 💀')
        } else {
            reply(`*Chatbot Status:* ${config.chatbot? 'ON ✅' : 'OFF ❌'}\n\nUse:.chatbot on/off`)
        }
    }
}
