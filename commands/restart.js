module.exports = {
    name: 'restart',
    alias: ['reboot'],
    desc: 'Restart the bot',
    category: 'owner',
    async execute({ reply, isOwner }) {
        if (!isOwner) return reply('*Owner only* 💀')
        await reply('*Restarting VOID-MD...* 💀')
        process.exit(1) // Render will auto-restart
    }
}
