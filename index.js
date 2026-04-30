const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const os = require('os')

// CONFIG
const PREFIX = '.'
const BOT_NAME = 'VOID-MD'
const OWNER_NAME = 'Mr Void'
const OWNER_NUMBER = '254112843071' // Your main number without +
const BOT_NUMBER = '254738440805' // Bot number that scanned QR
const BOT_IMAGE = 'https://i.ibb.co/6Z2QZQz/void.jpg'
const VERSION = 'v1.2.0'

let config = JSON.parse(fs.readFileSync('./config.json'))
const startTime = Date.now()
const msgStore = new Map()

// LOAD COMMANDS
const commands = new Map()
const commandsPath = path.join(__dirname, 'commands')
fs.readdirSync(commandsPath).forEach(file => {
    if (file.endsWith('.js')) {
        const command = require(path.join(commandsPath, file))
        commands.set(command.name, command)
        if (command.alias) {
            command.alias.forEach(alias => commands.set(alias, command))
        }
    }
})
console.log(`Loaded ${commands.size} commands`)

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['VOID-MD', 'Chrome', '1.0.0']
    })

    // AUTO ONLINE
    if (config.autonline) {
        setInterval(() => {
            sock.sendPresenceUpdate('available')
        }, 10000)
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) {
                startBot()
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connected')
            await sock.sendMessage(OWNER_NUMBER + '@s.whatsapp.net', {
                text: `*${BOT_NAME} ${VERSION}* is online 💀\n\n*Prefix:* ${PREFIX}\n*Commands:* ${commands.size}`
            })
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // ANTI DELETE - Store messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type!== 'notify') return
        const m = messages[0]
        if (!m.message) return

        // Store messages for antidelete
        if (!m.key.fromMe && config.antidelete) {
            msgStore.set(m.key.id, {
                sender: m.key.participant || m.key.remoteJid,
                from: m.key.remoteJid,
                message: m.message,
                timestamp: Date.now()
            })
            // Keep only last 100 msgs to save RAM
            if (msgStore.size > 100) {
                const firstKey = msgStore.keys().next().value
                msgStore.delete(firstKey)
            }
        }

        if (m.key.fromMe) return

        // Reload config every message so toggles work instantly
        try {
            config = JSON.parse(fs.readFileSync('./config.json'))
        } catch (e) {
            console.log('Config reload error:', e.message)
        }

        const from = m.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = m.key.participant || m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ''

        // Owner check - BOT_NUMBER has full control
        const isOwner = sender.split('@')[0] === OWNER_NUMBER || sender.split('@')[0] === BOT_NUMBER
        const isBot = sender.split('@')[0] === BOT_NUMBER

        const args = body.trim().split(/ +/).slice(1)
        const cmdName = body.trim().split(/ +/)[0].toLowerCase().slice(PREFIX.length)
        const cmd = commands.get(cmdName)

        // AUTO VIEW + REACT STATUS
        if (config.autoview && from === 'status@broadcast') {
            try {
                await sock.readMessages([m.key])
                
                // Auto react with random emoji
                const emojis = ['❤️', '😂', '😮', '😢', '🙏', '👍', '🔥', '💀', '😭', '🥺']
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                
                await sock.sendMessage(from, {
                    react: {
                        text: randomEmoji,
                        key: m.key
                    }
                })
                
                console.log(`Viewed + reacted ${randomEmoji} to status from ${sender.split('@')[0]}`)
            } catch (e) {
                console.log('Status view/react error:', e.message)
            }
            return
        }

        // AUTO READ
        if (config.autoread) {
            try {
                await sock.readMessages([m.key])
            } catch (e) {}
        }

        // ANTILINK
        if (config.antilink && isGroup &&!isOwner) {
            const linkRegex = /chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/
            if (linkRegex.test(body)) {
                const groupMetadata = await sock.groupMetadata(from)
                const botAdmin = groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin
                if (botAdmin) {
                    await sock.sendMessage(from, {
                        text: `*Antilink Detected* ⚠️\n@${sender.split('@')[0]} sent a link.`,
                        mentions:
                    }, { quoted: m })
                    await sock.groupParticipantsUpdate(from,, 'remove')
                    return
                }
            }
        }

        // CHATBOT - Auto reply when tagged
        if (config.chatbot && m.message.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user.id)) {
            const replies = ['Hey 💀', 'Yo Mr Void', 'What\'s up?', 'Bot here', 'Say that again?']
            const randomReply = replies[Math.floor(Math.random() * replies.length)]
            await sock.sendMessage(from, { text: randomReply }, { quoted: m })
            return
        }

        // PRESENCE - Auto typing/recording on ALL messages
        if (!config.autonline) {
            if (config.autotyping) {
                await sock.sendPresenceUpdate('composing', from)
                setTimeout(async () => {
                    await sock.sendPresenceUpdate('paused', from)
                }, 3000)
            } else if (config.autorecording) {
                await sock.sendPresenceUpdate('recording', from)
                setTimeout(async () => {
                    await sock.sendPresenceUpdate('paused', from)
                }, 3000)
            }
        }

        if (!body.startsWith(PREFIX)) return
        if (!cmd) return

        const reply = (text) => sock.sendMessage(from, { text }, { quoted: m })

        // Save config function for toggle commands
        const saveConfig = () => {
            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))
        }

        try {
            await cmd.execute({
                sock, m, from, sender, isGroup, isOwner, isBot, args, body,
                PREFIX, BOT_NAME, OWNER_NAME, OWNER_NUMBER, BOT_NUMBER, BOT_IMAGE, VERSION, commands, config, saveConfig,
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

    // ANTI DELETE - Catch deleted messages
    sock.ev.on('messages.update', async (updates) => {
        if (!config.antidelete) return

        for (const { key, update } of updates) {
            if (update.messageStubType === 8 && msgStore.has(key.id)) { // 8 = delete
                const msg = msgStore.get(key.id)
                const deletedBy = key.participant || key.remoteJid

                if (deletedBy === sock.user.id) return // Don't show if bot deleted it

                let text = `*ANTI DELETE* 💀\n\n`
                text += `*Deleted by:* @${deletedBy.split('@')[0]}\n`
                text += `*Original sender:* @${msg.sender.split('@')[0]}\n`
                text += `*Time:* ${new Date(msg.timestamp).toLocaleTimeString()}\n\n`
                text += `*Message:* \n`

                const content = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '_Media message_'
                text += content

                await sock.sendMessage(msg.from, {
                    text,
                    mentions: [deletedBy, msg.sender]
                })

                msgStore.delete(key.id)
            }
        }
    })
}

startBot()
