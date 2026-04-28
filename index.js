const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const express = require('express')
const yts = require('yt-search')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000

// ===== CONFIG - CHANGE THESE =====
const BOT_NAME = 'VOID-MD'
const OWNER_NUMBER = '254700000000' // CHANGE: no + or spaces
const BOT_IMAGE = 'https://i.imgur.com/YOUR_BANNER.png' // CHANGE
const VERSION = 'v3.1.0'
const PREFIX = '.'
// =================================

let botConnected = false
const startTime = Date.now()

// DB Setup
if (!fs.existsSync('./database.json')) {
    fs.writeFileSync('./database.json', JSON.stringify({ data: { antilink: {}, welcome: {} } }, null, 2))
}
global.db = JSON.parse(fs.readFileSync('./database.json'))
const saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2))

async function connectBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: [BOT_NAME, 'Chrome', VERSION]
    })

    // ===== PAIRING CODE =====
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            const code = await sock.requestPairingCode(OWNER_NUMBER)
            console.log(`\n\n========================================`)
            console.log(` PAIRING CODE: ${code}`)
            console.log(`========================================`)
            console.log(`WhatsApp → Linked Devices → Link with phone number`)
            console.log(`Enter code: ${code}\n\n`)
        }, 3000)
    }
    // ========================

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            botConnected = false
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) setTimeout(connectBot, 5000)
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} Connected!`)
            botConnected = true
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // Welcome message
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await sock.groupMetadata(anu.id)
            if (anu.action === 'add' && global.db.data.welcome[anu.id] === 'on') {
                for (let user of anu.participants) {
                    await sock.sendMessage(anu.id, {
                        text: `*WELCOME* 👋\n\n@${user.split('@')[0]} joined *${metadata.subject}*\n\nMembers: ${metadata.participants.length}\nRead group rules!`,
                        mentions: [user]
                    })
                }
            }
        } catch (e) {}
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe || m.key.remoteJid === 'status@broadcast') return

        const from = m.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = m.key.participant || from
        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || ''
        const args = body.trim().split(/ +/).slice(1)
        const command = body.startsWith(PREFIX)? body.slice(PREFIX.length).trim().split(' ')[0].toLowerCase() : ''
        const text = args.join(' ')
        const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        const isOwner = sender.split('@')[0] === OWNER_NUMBER

        m.reply = (txt) => sock.sendMessage(from, { text: txt }, { quoted: m })

        let groupAdmins = [], isBotAdmin = false, isSenderAdmin = false
        if (isGroup) {
            const metadata = await sock.groupMetadata(from)
            groupAdmins = metadata.participants.filter(p => p.admin).map(p => p.id)
            isBotAdmin = groupAdmins.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net')
            isSenderAdmin = groupAdmins.includes(sender)
        }

        const uptime = () => {
            let s = Math.floor((Date.now() - startTime) / 1000)
            let h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60)
            s = Math.floor(s % 60)
            return `${h}h ${m}m ${s}s`
        }

        // Anti-link check
        if (isGroup && global.db.data.antilink[from] === 'on' &&!isSenderAdmin &&!isOwner) {
            if (body.match(/chat\.whatsapp\.com|https?:\/\/|www\.|t\.me|bit\.ly/i)) {
                await sock.sendMessage(from, { delete: m.key })
                await m.reply(`*ANTI-LINK* ⚠️\n@${sender.split('@')[0]} links not allowed!`, { mentions: [sender] })
                if (isBotAdmin) await sock.groupParticipantsUpdate(from, [sender], 'remove')
                return
            }
        }

        try {
            switch (command) {
                case 'menu': {
                    const menu = `
╭─── *${BOT_NAME} ${VERSION}* ───╮
│ Prefix: ${PREFIX}
│ Uptime: ${uptime()}
╰────────────────╯

*MAIN*
${PREFIX}ping - Speed test
${PREFIX}play <song> - YouTube search
${PREFIX}owner - Owner contact

*GROUP ADMIN*
${PREFIX}kick @user - Remove user
${PREFIX}antilink on/off - Anti-link
${PREFIX}welcome on/off - Welcome msg

*OWNER*
${PREFIX}ownermenu - Owner commands`
                    await sock.sendMessage(from, { image: { url: BOT_IMAGE }, caption: menu }, { quoted: m })
                }
                break

                case 'ping': {
                    const start = Date.now()
                    await m.reply(`*PONG!* ⚡\nSpeed: ${Date.now() - start}ms\nUptime: ${uptime()}`)
                }
                break

                case 'play': {
                    if (!text) return m.reply(`Usage: ${PREFIX}play alan walker faded`)
                    m.reply('🔍 Searching...')
                    try {
                        let search = await yts(text)
                        let vid = search.videos[0]
                        if (!vid) return m.reply('❌ Not found')
                        await sock.sendMessage(from, {
                            image: { url: vid.thumbnail },
                            caption: `*YouTube Result*\n\n*Title:* ${vid.title}\n*Duration:* ${vid.timestamp}\n*Views:* ${vid.views.toLocaleString()}\n*Link:* ${vid.url}`
                        }, { quoted: m })
                    } catch (e) {
                        m.reply(`Error: ${e.message}`)
                    }
                }
                break

                case 'kick': {
                    if (!isGroup) return m.reply('Group only')
                    if (!isSenderAdmin &&!isOwner) return m.reply('Admin only 💀')
                    if (!isBotAdmin) return m.reply('Bot needs admin')
                    if (!mentioned[0]) return m.reply(`Tag user: ${PREFIX}kick @user`)
                    await sock.groupParticipantsUpdate(from, [mentioned[0]], 'remove')
                    m.reply(`✅ @${mentioned[0].split('@')[0]} kicked`, { mentions: [mentioned[0]] })
                }
                break

                case 'antilink': {
                    if (!isGroup) return m.reply('Group only')
                    if (!isSenderAdmin &&!isOwner) return m.reply('Admin only 💀')
                    if (args[0] === 'on') {
                        global.db.data.antilink[from] = 'on'; saveDB()
                        m.reply('✅ *Anti-Link enabled*\nLinks will be deleted + user kicked')
                    } else if (args[0] === 'off') {
                        global.db.data.antilink[from] = 'off'; saveDB()
                        m.reply('✅ *Anti-Link disabled*')
                    } else {
                        m.reply(`Anti-Link: ${global.db.data.antilink[from] === 'on'? 'ON' : 'OFF'}\n\nUse: ${PREFIX}antilink on/off`)
                    }
                }
                break

                case 'welcome': {
                    if (!isGroup) return m.reply('Group only')
                    if (!isSenderAdmin &&!isOwner) return m.reply('Admin only 💀')
                    if (args[0] === 'on') {
                        global.db.data.welcome[from] = 'on'; saveDB()
                        m.reply('✅ *Welcome enabled*')
                    } else if (args[0] === 'off') {
                        global.db.data.welcome[from] = 'off'; saveDB()
                        m.reply('✅ *Welcome disabled*')
                    } else {
                        m.reply(`Welcome: ${global.db.data.welcome[from] === 'on'? 'ON' : 'OFF'}\n\nUse: ${PREFIX}welcome on/off`)
                    }
                }
                break

                case 'owner': {
                    await sock.sendMessage(from, {
                        contacts: {
                            displayName: 'Owner',
                            contacts: [{ vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Owner\nTEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\nEND:VCARD` }]
                        }
                    })
                }
                break

                case 'ownermenu': {
                    if (!isOwner) return m.reply('Owner only 💀')
                    await m.reply(`*👑 OWNER MENU*\n\n${PREFIX}restart - Restart bot\n${PREFIX}getdb - Backup DB`)
                }
                break

                case 'restart': {
                    if (!isOwner) return m.reply('Owner only 💀')
                    await m.reply('Restarting...')
                    process.exit()
                }
                break

                case 'getdb': {
                    if (!isOwner) return m.reply('Owner only 💀')
                    let database = JSON.stringify(global.db.data, null, 2)
                    await sock.sendMessage(from, {
                        document: Buffer.from(database),
                        mimetype: 'application/json',
                        fileName: `database-${Date.now()}.json`
                    }, { quoted: m })
                }
                break
            }
        } catch (e) {
            console.log(e)
        }
    })
}

app.get('/', (req, res) => {
    if (botConnected) {
        res.send(`<h1>✅ ${BOT_NAME} ${VERSION} Online</h1><p>Bot is running</p>`)
    } else {
        res.send(`<h1>🔄 ${BOT_NAME} Connecting...</h1><p>Check Render logs for pairing code</p>`)
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectBot()
})
