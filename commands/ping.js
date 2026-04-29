module.exports = {
    name: 'ping',
    alias: ['p'],
    desc: 'Check bot speed',
    execute: async ({ reply }) => {
        const start = Date.now()
        reply(`🏓 Pong! ${Date.now() - start}ms`)
    }
}
