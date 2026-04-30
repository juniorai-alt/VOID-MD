module.exports = {
    name: 'menu',
    alias: ['help', 'list', 'commands'],
    desc: 'Show all commands',
    category: 'general',
    async execute({ reply, commands, PREFIX, BOT_NAME, VERSION, uptime, isOwner, config, sock, from, m, BOT_IMAGE }) {
        // Group commands by category
        const categories = {}
        commands.forEach((cmd, name) => {
            if (name!== cmd.name) return // Skip aliases
            const cat = cmd.category || 'general'
            if (!categories[cat]) categories[cat] = []
            categories[cat].push(cmd)
        })

        let text = `*${BOT_NAME} ${VERSION}* 💀\n`
        text += `*Uptime:* ${uptime()}\n`
        text += `*Prefix:* ${PREFIX}\n`
        text += `*Total Commands:* ${commands.size}\n\n`

        // Show toggles status for owner
        if (isOwner) {
            text += `*SYSTEM TOGGLES*\n`
            text += `├ Autoview: ${config.autoview? '✅' : '❌'}\n`
            text += `├ Autotyping: ${config.autotyping? '✅' : '❌'}\n`
            text += `├ Autorecording: ${config.autorecording? '✅' : '❌'}\n`
            text += `├ Autonline: ${config.autonline? '✅' : '❌'}\n`
            text += `├ Autoread: ${config.autoread? '✅' : '❌'}\n`
            text += `├ Antidelete: ${config.antidelete? '✅' : '❌'}\n`
            text += `├ Antilink: ${config.antilink? '✅' : '❌'}\n`
            text += `└ Chatbot: ${config.chatbot? '✅' : '❌'}\n\n`
        }

        // List commands by category
        text += `*COMMAND LIST*\n`
        for (const [cat, cmds] of Object.entries(categories)) {
            if (cat === 'owner' &&!isOwner) continue

            const catName = cat.toUpperCase()
            text += `\n*${catName}* [${cmds.length}]\n`
            cmds.forEach(cmd => {
                text += `├ ${PREFIX}${cmd.name} - ${cmd.desc}\n`
            })
        }

        text += `\n*Usage:* ${PREFIX}command`

        // Send with bot image
        try {
            await sock.sendMessage(from, {
                image: { url: BOT_IMAGE },
                caption: text
            }, { quoted: m })
        } catch (e) {
            // Fallback to text if image fails
            reply(text)
        }
    }
}
