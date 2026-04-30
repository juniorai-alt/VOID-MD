module.exports = {
    name: 'ping',
    alias: ['speed', 'pong'],
    desc: 'Check bot response time',
    category: 'general',
    async execute({ reply, sock, from, m }) {
        const start = Date.now()
        const msg = await reply('*Testing...* 💀')
        const end = Date.now()
        await sock.sendMessage(from, {
            text: `*Pong!* 🏓\n*Speed:* ${end - start}ms`,
            edit: msg.key
        })
    }
}
