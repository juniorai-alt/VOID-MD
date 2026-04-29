const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const express = require('express')
const qrcode = require('qrcode-terminal') // 👈 Added this
const app = express()

// === CONFIG ===
const BOT_NAME = 'VOID-MD'
const OWNER_NAME = 'Mr Void'
const OWNER_NUMBER = '254112843071'
const BOT_IMAGE = 'https://files.catbox.moe/bhiw6e.png'
const VERSION = 'v1.2.0'
const PREFIX = '.'
// =============================

const startTime = Date.now()
let config = JSON.parse(fs.readFileSync('./config.json'))

// Command loader
const commands = new Map()
const cmdDir = path.join(__dirname, 'commands')
fs.readdirSync(cmdDir).forEach(file => {
    if (file.endsWith('.js')) {
        const cmd = require(path.join(cmdDir, file))
        commands.set(cmd.name, cmd)
        if (cmd.alias) cmd.alias.forEach(a => commands.set(a, cmd))
    }
})
console.log(`Loaded ${commands.size} commands`)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        logger: pino({ level: 'fatal' }), // Removed printQRInTerminal
        browser: ['VOID-MD', 'Chrome', '1.0.0'],
        markOnlineOnConnect: config.autonline,
        generateHighQualityLinkPreview: true
    })

    sock.ev.on('creds.update', saveCreds)

    // ✅ QR CODE FIX HERE
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            console.log('SCAN THIS QR CODE:')
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} Connected!`)
        }
    })

    // Auto features
    sock.ev.on('presence.update', async ({ id, presences }) => {
        if (config.autonline) {
            await sock.sendPresenceUpdate('available')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type!== 'notify') return
        const m = messages[0]
        if (!m.message || m.key.fromMe) return

        const from = m.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = m.key.participant || m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || ''
        const isOwner = sender.split('@')[0] === OWNER_NUMBER
        const args = body.trim().split(/ +/).slice(1)
        const cmdName = body.trim().split(/ +/)[0].toLowerCase().slice(PREFIX.length)
        const cmd = commands.get(cmdName)

        // Auto read
        if (config.autoread) await sock.readMessages([m.key])

        // Auto view status
        if (config.autoview && from === 'status@broadcast') {
            await sock.readMessages([m.key])
        }

        // Auto typing/recording
        if (cmd && config.autotyping &&!config.autonline) {
            await sock.sendPresenceUpdate('composing', from)
        } else if (cmd && config.autorecording &&!config.autonline) {
            await sock.sendPresenceUpdate('recording', from)
        }

        // Antilink
        if (isGroup && config.antilink && body.match(/chat\.whatsapp\.com\/[a-zA-Z0-9]/)) {
            const groupMetadata = await sock.groupMetadata(from)
            const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin!== null
            const botAdmin = groupMetadata.participants.find(p => p.id === sock.user.id)?.admin!== null
            if (!isAdmin && botAdmin) {
                await sock.sendMessage(from, { delete: m.key })
                await sock.groupParticipantsUpdate(from, [sender], 'remove')
                await sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]} removed for sending group link`, mentions: [sender] })
            }
        }

        // Chatbot
        if (config.chatbot && body.toLowerCase().includes(BOT_NAME.toLowerCase()) &&!cmd) {
            await sock.sendMessage(from, { text: `Yo! You called ${BOT_NAME}? Type ${PREFIX}menu for commands 💀` }, { quoted: m })
        }

        // Command handler
        if (!body.startsWith(PREFIX)) return
        if (!cmd) return

        const reply = (text) => sock.sendMessage(from, { text }, { quoted: m })

        try {
            await cmd.execute({
                sock,
                m,
                from,
                sender,
                isGroup,
                isOwner,
                args,
                body,
                PREFIX,
                BOT_NAME,
                OWNER_NAME,
                OWNER_NUMBER,
                BOT_IMAGE,
                VERSION,
                uptime: () => {
                    let s = Math.floor((Date.now() - startTime) / 1000)
                    let h = Math.floor(s / 3600), min = Math.floor(s % 3600 / 60)
                    s = Math.floor(s % 60)
                    return `${h}h ${min}m ${s}s`
                },
                reply,
                mentioned: m.message.extendedTextMessage?.contextInfo?.mentionedJid || [],
                quoted: m.message.extendedTextMessage?.contextInfo?.quotedMessage? {
                    sender: m.message.extendedTextMessage.contextInfo.participant,
                    message: m.message.extendedTextMessage.contextInfo.quotedMessage
                } : null
            })
        } catch (e) {
            console.error(e)
            reply(`❌ Error: ${e.message}`)
        }
    })

    // Welcome/Goodbye
    sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
        if (!config.welcome) return
        const groupMetadata = await sock.groupMetadata(id)
        for (let user of participants) {
            if (action === 'add') {
                await sock.sendMessage(id, {
                    image: { url: BOT_IMAGE },
                    caption: `👋 *WELCOME* @${user.split('@')[0]}\n\nWelcome to *${groupMetadata.subject}*\n\n📝 Read group description\n✅ Follow rules\n💬 Enjoy!`,
                    mentions: [user]
                })
            } else if (action === 'remove') {
                await sock.sendMessage(id, { text: `👋 Goodbye @${user.split('@')[0]}`, mentions: [user] })
            }
        }
    })

    // Anti delete
    sock.ev.on('messages.update', async (updates) => {
        if (!config.antidelete) return
        for (const { key, update } of updates) {
            if (update.messageStubType === 68) {
                try {
                    const msg = await sock.loadMessage(key.remoteJid, key.id)
                    if (!msg || key.fromMe) return
                    const sender = key.participant || key.remoteJid
                    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Media message'
                    await sock.sendMessage(key.remoteJid, {
                        text: `🗑️ *ANTI DELETE*\n\n👤 @${sender.split('@')[0]} deleted:\n\n${text}`,
                        mentions: [sender]
                    })
                } catch {}
            }
        }
    })
}

startBot()

// Keep alive for Render
app.get('/', (req, res) => res.send(`${BOT_NAME} Running!`))
app.listen(process.env.PORT || 10000, () => console.log('VOID-MD Server running on port 10000'))
