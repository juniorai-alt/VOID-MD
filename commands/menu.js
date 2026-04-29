module.exports = {
    name: 'menu',
    alias: ['help', 'list'],
    desc: 'Show all commands',
    execute: async ({ reply, commands, PREFIX, BOT_NAME, VERSION }) => {
        let text = `*${BOT_NAME} ${VERSION}*\n\n*COMMANDS:*\n`
        const uniqueCmds = new Set()
        commands.forEach((cmd, name) => {
            if (!cmd.alias ||!cmd.alias.includes(name)) {
                uniqueCmds.add(name)
            }
        })
        uniqueCmds.forEach(name => {
            const cmd = commands.get(name)
            text += `▸ ${PREFIX}${name} - ${cmd.desc || 'No desc'}\n`
        })
        text += `\n_Prefix: ${PREFIX}_`
        reply(text)
    }
}
