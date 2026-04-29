const fs = require('fs')
const path = require('path')

module.exports = {
    name: 'settings',
    alias: ['config'],
    desc: 'Show all bot settings',
    execute: async ({ sock, m, from, PREFIX, BOT_NAME, reply }) => {
        await sock.sendMessage(from, { react: { text: '⚙️', key: m.key } })

        const configPath = path.join(__dirname, '../config.json')
        let config = JSON.parse(fs.readFileSync(configPath))

        const status = (val) => val? 'ON ✅' : 'OFF ❌'

        const text = `*⚙️ ${BOT_NAME} SETTINGS*

*👋 WELCOME*
┃ Status: ${status(config.welcome)}
┃ Toggle: ${PREFIX}welcome on/off
┃

*🔗 ANTILINK*
┃ Status: ${status(config.antilink)}
┃ Toggle: ${PREFIX}antilink on/off
┃

*📖 AUTO READ*
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

*⌨️ AUTO TYPING*
┃ Status: ${status(config.autotyping)}
┃ Toggle: ${PREFIX}autotyping on/off
┃

*🎙️ AUTO RECORDING*
┃ Status: ${status(config.autorecording)}
┃ Toggle: ${PREFIX}autorecording on/off
┃

*🟢 AUTO ONLINE*
┃ Status: ${status(config.autonline)}
┃ Toggle: ${PREFIX}autonline on/off
┃

_Powered by VOID-MD_`

        await reply(text)
    }
}
