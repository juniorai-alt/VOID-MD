module.exports = {
    name: 'ping',
    desc: 'Check bot response speed',
    execute: async ({ sock, m, from, reply }) => {
        const start = Date.now()
        await sock.sendMessage(from, { react: { text: '🏓', key: m.key } })
        const end = Date.now()
        await reply(`🏓 *PONG!*\n\n⚡ Speed: ${end - start}ms`)
    }
}
