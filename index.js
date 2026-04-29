const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const express = require('express')
const qrcode = require('qrcode')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000

// === CONFIG ===
const BOT_NAME = 'VOID-MD'
const OWNER_NAME = 'Mr Void'
const OWNER_NUMBER = '254112843071'
const BOT_IMAGE = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
const VERSION = 'v1.2.0'
const PREFIX = '.'
// =============================

const startTime = Date.now()
let qrCode = null
let botConnected = false
let commands = new Map()

// === CONFIG FILE FOR TOGGLES ===
const configPath = path.join(__dirname, 'config.json')
let botConfig = {
    welcome: false,
    antilink: false,
    autoread: true,
    antidelete: false,
    chatbot: false,
    autoview: false,
    autotyping: false,
    autorecording: false,
    autonline: false,
    statusEmojis: ['🔥', '❤️', '😂', '😮', '💯', '💀', '👑', '✨']
}

function loadConfig() {
    if (fs.existsSync(configPath)) {
        botConfig = {...botConfig,...JSON.parse(fs.readFileSync(configPath)) }
    } else {
        fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2))
    }
}
function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2))
}
// ===============================

// === ANTI DELETE STORE ===
let msgStore = new Map()
// =========================

// Auto-load commands from /commands folder
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands')
    if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath)

    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))
    commands.clear()

    for (const file of files) {
        delete require.cache[require.resolve(`./commands/${file}`)]
        const command = require(`./commands/${file}`)
        commands.set(command.name, command)
        if (command.alias) command.alias.forEach(a => commands.set(a, command))
    }
    console.log(`Loaded ${files.length} commands`)
}

async function connectBot() {
    loadCommands()
    loadConfig()
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['VOID-MD', 'Chrome', '1.0.0']
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if(qr) {
            qrCode = qr
            botConnected = false
            console.log('QR Generated')
        }
        if(connection === 'close') {
            botConnected = false
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) setTimeout(connectBot, 5000)
        } else if(connection === 'open') {
            console.log('✅ VOID-MD Connected!')
            botConnected = true
            qrCode = null

            // === AUTO ONLINE LOOP ===
            setInterval(async () => {
                if (botConfig.autonline && botConnected) {
                    try {
                        await sock.sendPresenceUpdate('available')
                    } catch (e) {}
                }
            }, 10000) // Updates every 10 seconds
            // ========================
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // === WELCOME & GOODBYE ===
    sock.ev.on('group-participants.update', async (update) => {
        if (!botConfig.welcome) return
        try {
            const { id, participants, action } = update
            const groupMetadata = await sock.groupMetadata(id)

            for (let user of participants) {
                let pfp
                try {
                    pfp = await sock.profilePictureUrl(user, 'image')
                } catch {
                    pfp = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
                }

                if (action === 'add') {
                    const text = `*WELCOME TO ${groupMetadata.subject}*\n\n@${user.split('@')[0]}\n\n📜 Read group description\n⚠️ Follow the rules\n🎉 Enjoy your stay\n\n_Powered by VOID-MD_`
                    await sock.sendMessage(id, {
                        image: { url: pfp },
                        caption: text,
                        mentions: [user]
                    })
                } else if (action === 'remove') {
                    const text = `*GOODBYE*\n\n@${user.split('@')[0]} left ${groupMetadata.subject}\n\n_Powered by VOID-MD_`
                    await sock.sendMessage(id, { text, mentions: [user] })
                }
            }
        } catch (e) {
            console.log('Welcome error:', e.message)
        }
    })

    // === ANTI DELETE LISTENER ===
    sock.ev.on('messages.update', async (updates) => {
        if (!botConfig.antidelete) return
        for (const { key, update } of updates) {
            if (update.messageStubType === 0) continue
            if (update.message === null) {
                const stored = msgStore.get(`${key.remoteJid}_${key.id}`)
                if (!stored?.message) return

                const sender = stored.key.participant || stored.key.remoteJid
                const content = stored.message.conversation ||
                               stored.message.extendedTextMessage?.text ||
                               stored.message.imageMessage?.caption ||
                               stored.message.videoMessage?.caption ||
                               '*Media deleted*'

                await sock.sendMessage(key.remoteJid, {
                    text: `*ANTI DELETE*\n\n@${sender.split('@')[0]} deleted:\n\n${content}`,
                    mentions: [sender]
                })

                if (stored.message.imageMessage) {
                    const buffer = await sock.downloadMediaMessage(stored)
                    await sock.sendMessage(key.remoteJid, { image: buffer, caption: 'Deleted image recovered' })
                } else if (stored.message.videoMessage) {
                    const buffer = await sock.downloadMediaMessage(stored)
                    await sock.sendMessage(key.remoteJid, { video: buffer, caption: 'Deleted video recovered' })
                } else if (stored.message.stickerMessage) {
                    const buffer = await sock.downloadMediaMessage(stored)
                    await sock.sendMessage(key.remoteJid, { sticker: buffer })
                }
            }
        }
    })

    // === MAIN MESSAGE HANDLER - ALL HOOKS MERGED ===
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return

        const from = m.key.remoteJid
        const sender = m.key.participant || m.key.remoteJid

        // === STATUS HANDLER ===
        if (from === 'status@broadcast') {
            if (botConfig.autoview) {
                try {
                    await sock.readMessages([m.key])
                } catch (e) {}
            }
            return
        }
        // ======================

        // === ANTI DELETE CACHE ===
        if (!m.key.fromMe) {
            msgStore.set(`${from}_${m.key.id}`, m)
            if (msgStore.size > 500) msgStore.delete(msgStore.keys().next().value)
        }
        // =========================

        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ''

        // === ANTILINK ===
        if (botConfig.antilink && from.endsWith('@g.us') &&!body.startsWith(PREFIX)) {
            const linkRegex = /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/
            if (linkRegex.test(body)) {
                try {
                    const groupMetadata = await sock.groupMetadata(from)
                    const isBotAdmin = groupMetadata.participants.find(p => p.id === sock.user.id)?.admin
                    const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin
                    if (isBotAdmin &&!isAdmin) {
                        await sock.sendMessage(from, { delete: m.key })
                        await sock.sendMessage(from, {
                            text: `⚠️ @${sender.split('@')[0]} Group links are not allowed!`,
                            mentions: [sender]
                        })
                        await sock.groupParticipantsUpdate(from, [sender], 'remove')
                        return
                    }
                } catch (e) {}
            }
        }
        // ================

        // === AUTO READ ===
        if (botConfig.autoread) {
            try {
                await sock.readMessages([m.key])
            } catch (e) {}
        }
        // =================

        // === AUTO TYPING / RECORDING ===
        if ((botConfig.autotyping || botConfig.autorecording) && body.startsWith(PREFIX) &&!botConfig.autonline) {
            try {
                if (botConfig.autorecording) {
                    await sock.sendPresenceUpdate('recording', from)
                } else if (botConfig.autotyping) {
                    await sock.sendPresenceUpdate('composing', from)
                }

                setTimeout(async () => {
                    await sock.sendPresenceUpdate('paused', from)
                }, 5000)
            } catch (e) {}
        }
        // ===============================

        // === CHATBOT ===
        if (botConfig.chatbot &&!m.key.fromMe &&!body.startsWith(PREFIX)) {
            const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
            const quotedSender = m.message.extendedTextMessage?.contextInfo?.participant
            if (mentioned.includes(sock.user.id) || quotedSender === sock.user.id) {
                const responses = ["I'm here Mr Void 🤖", "What's up?", "Say that again?", "Bet", "Void here, speak", "I'm listening...", "You called?", "Sup"]
                const replyText = responses[Math.floor(Math.random() * responses.length)]
                await sock.sendMessage(from, { text: replyText }, { quoted: m })
                return
            }
        }
        // ===============

        // === COMMAND HANDLER ===
        if (!body.startsWith(PREFIX)) return

        const args = body.slice(PREFIX.length).trim().split(' ')
        const cmdName = args.shift().toLowerCase()
        const cmd = commands.get(cmdName)

        if (!cmd) return

        const extra = {
            sock, m, from, sender, args,
            quoted: m.message.extendedTextMessage?.contextInfo?.quotedMessage,
            mentioned: m.message.extendedTextMessage?.contextInfo?.mentionedJid || [],
            isGroup: from.endsWith('@g.us'),
            isOwner: sender.split('@')[0] === OWNER_NUMBER,
            PREFIX, BOT_NAME, OWNER_NAME, OWNER_NUMBER, VERSION, BOT_IMAGE,
            timeEAT: new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }),
            uptime: () => {
                let s = Math.floor((Date.now() - startTime) / 1000)
                let h = Math.floor(s / 3600), min = Math.floor(s % 3600 / 60)
                s = Math.floor(s % 60)
                return `${h}h ${min}m ${s}s`
            },
            reply: async (text) => await sock.sendMessage(from, { text }, { quoted: m }),
            commands
        }

        try {
            await cmd.execute(extra)
        } catch (e) {
            console.error(e)
            await sock.sendMessage(from, { text: 'Error running command' }, { quoted: m })
        }
    })
}

app.get('/', async (req, res) => {
    if (botConnected) {
        res.send('<h1>✅ VOID-MD is online!</h1><p>Send.menu to your bot number</p>')
    } else if (qrCode) {
        const qrImage = await qrcode.toDataURL(qrCode)
        res.send(`<h1>Scan QR to Connect VOID-MD</h1><p>WhatsApp → Linked Devices → Link Device</p><img src="${qrImage}"><script>setTimeout(() => location.reload(), 20000)</script>`)
    } else {
        res.send('<h1>Starting VOID-MD...</h1><p>Refresh in 15 seconds</p><script>setTimeout(() => location.reload(), 15000)</script>')
    }
})

app.listen(PORT, () => {
    console.log(`VOID-MD Server running on port ${PORT}`)
    connectBot()
})
