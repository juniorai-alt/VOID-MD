module.exports = {
    name: 'shutdown',
    alias: ['off', 'die'],
    desc: 'Shutdown the bot',
    category: 'owner',
    async execute({ reply, isOwner }) {
        if (!isOwner) return reply('*Owner only* 💀')
        await reply('*VOID-MD shutting down...* 💀')
        process.exit(0)
    }
}
