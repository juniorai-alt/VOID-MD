const os = require('os')

module.exports = {
    name: 'status',
    alias: ['botstat'],
    desc: 'Show bot system status',
    category: 'owner',
    async execute({ reply, uptime, commands, isOwner, config }) {
        if (!isOwner) return reply('*Owner only* 💀')

        const used = process.memoryUsage()
        const ram = (used.rss / 1024 / 1024).toFixed(2)
        const cpu = os.loadavg()[0].toFixed(2)

        let text = `*VOID-MD STATUS* 💀\n\n`
        text += `*Uptime:* ${uptime()}\n`
        text += `*RAM:* ${ram} MB\n`
        text += `*CPU Load:* ${cpu}%\n`
        text += `*Commands:* ${commands.size}\n`
        text += `*Platform:* ${os.platform()}\n\n`
        text += `*ACTIVE FEATURES*\n`
        text += `${config.autoview? '✅' : '❌'} Autoview\n`
        text += `${config.autotyping? '✅' : '❌'} Autotyping\n`
        text += `${config.autorecording? '✅' : '❌'} Autorecording\n`
        text += `${config.autonline? '✅' : '❌'} Autonline\n`
        text += `${config.autoread? '✅' : '❌'} Autoread\n`
        text += `${config.antidelete? '✅' : '❌'} Antidelete\n`
        text += `${config.antilink? '✅' : '❌'} Antilink\n`
        text += `${config.chatbot? '✅' : '❌'} Chatbot`

        reply(text)
    }
}
