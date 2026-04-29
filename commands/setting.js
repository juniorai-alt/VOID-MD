const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'settings',
    alias: ['setting', 'config', 'toggles'],
    desc: 'Show all bot feature toggles',
    execute: async ({ sock, m, from, isOwner, PREFIX, reply }) => {
        await sock.sendMessage(from, { react: { text: '⚙️', key: m.key } })
        if (!isOwner) return reply('Owner only')

        const configPath = path.join(__dirname, '../config.json')
        let config = {
            welcome: false,
            antilink: false,
            autoread: true,
            antidelete: false,
            chatbot: false,
            autoview: false
        }

        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath))
        }

        const status = (state) => state? 'ON ✅' : 'OFF ❌'

        const text = `*⚙️ VOID-MD SETTINGS*

*👋 WELCOME*
┃ Status: ${status(config.welcome)}
┃ Toggle: ${PREFIX}welcome on/off
┃

*🔗 ANTILINK*
┃ Status: ${status(config.antilink)}
┃ Toggle: ${PREFIX}antilink on/off
┃

*👀 AUTO READ*
┃ Status: ${status(config.autoread)}
┃ Toggle: ${PREFIX}autoread on/off
┃

*🗑️ ANTI DELETE*
┃ Status: ${status(config.antidelete)}
┃ Toggle: ${PREFIX}antidelete on/off
┃

*🤖 CHATBOT*
┃ Status: ${status(config.chatbot)}
┃ Toggle: ${PREFIX}chatbot on/off
┃

*👁️ AUTO VIEW STATUS*
┃ Status: ${status(config.autoview)}
┃ Toggle: ${PREFIX}autoview on/off
┃

_Powered by VOID-MD_`

        await reply(text)
    }
}
