module.exports = {
    name: 'alive',
    desc: 'Check if bot is online',
    execute: async ({ reply, BOT_NAME, VERSION, uptime }) => {
        reply(`✅ *${BOT_NAME} ${VERSION}* is alive!\n\n*Uptime:* ${uptime()}`)
    }
}
