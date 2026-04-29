module.exports = {
    name: 'ping',
    alias: ['speed'],
    desc: 'Check bot speed',
    execute: async ({ reply }) => {
        const start = Date.now()
        await reply(`*VOID-MD SPEED*\n📊 Response: ${Date.now() - start}ms`)
    }
}
