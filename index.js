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
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return

        const from = m.key.remoteJid
        const sender = m.key.participant || m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ''

        if (!body.startsWith(PREFIX)) return

        const args = body.slice(PREFIX.length).trim().split(' ')
        const cmdName = args.shift().toLowerCase()
        const cmd = commands.get(cmdName)

        if (!cmd) return

        const extra = {
            sock, m, from, sender, args, quoted: m.message.extendedTextMessage?.contextInfo?.quotedMessage,
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
