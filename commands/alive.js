module.exports = {
    name: 'alive',
    desc: 'Check if bot is running',
    execute: async ({ sock, m, from, BOT_NAME, BOT_IMAGE, uptime, reply }) => {
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
        await sock.sendMessage(from, {
            image: { url: BOT_IMAGE },
            caption: `*✅ ${BOT_NAME} IS ALIVE*\n\n⏰ Uptime: ${uptime()}\n\n_Powered by VOID-MD_`
        })
    }
}
