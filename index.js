const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const express = require('express')
const qrcode = require('qrcode')
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
let qrCodeData = null
let isConnected = false

// Command loader
const commands = new Map()
const cmdDir = path.join(__dirname, 'commands')

if (fs.existsSync(cmdDir)) {
    fs.readdirSync(cmdDir).forEach(file => {
        if (file.endsWith('.js')) {
            const cmd = require(path.join(cmdDir, file))
            commands.set(cmd.name, cmd)
            if (cmd.alias) cmd.alias.forEach(a => commands.set(a, cmd))
        }
    })
}
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
        logger: pino({ level: 'fatal' }),
        browser: ['VOID-MD', 'Chrome', '1.0.0'],
        markOnlineOnConnect: config.autonline,
        generateHighQualityLinkPreview: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            qrCodeData = await qrcode.toDataURL(qr)
            console.log('QR generated - visit your Render URL to scan')
        }

        if (connection === 'close') {
            isConnected = false
            qrCodeData = null
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode!== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            isConnected = true
            qrCodeData = null
            console.log(`✅ ${BOT_NAME} Connected!`)
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

        if (config.autoread) await sock.readMessages([m.key])
        if (config.autoview && from === 'status@broadcast') await sock.readMessages([m.key])

        if (cmd && config.autotyping &&!config.autonline) {
            await sock.sendPresenceUpdate('composing', from)
        } else if (cmd && config.autorecording &&!config.autonline) {
            await sock.sendPresenceUpdate('recording', from)
        }

        if (!body.startsWith(PREFIX)) return
        if (!cmd) return

        const reply = (text) => sock.sendMessage(from, { text }, { quoted: m })

        try {
            await cmd.execute({
                sock, m, from, sender, isGroup, isOwner, args, body,
                PREFIX, BOT_NAME, OWNER_NAME, OWNER_NUMBER, BOT_IMAGE, VERSION, commands,
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
}

startBot()

app.get('/', (req, res) => {
    if (isConnected) {
        res.send(`
            <html>
                <head><title>${BOT_NAME}</title></head>
                <body style="background:#000;color:#0f0;text-align:center;padding:50px;font-family:monospace">
                    <h1>✅ ${BOT_NAME} Running!</h1>
                    <p>Bot is connected to WhatsApp</p>
                    <img src="${BOT_IMAGE}" width="200" style="border-radius:20px;margin-top:20px">
                </body>
            </html>
        `)
    } else if (qrCodeData) {
        res.send(`
            <html>
                <head><title>Scan QR - ${BOT_NAME}</title></head>
                <body style="background:#000;color:#fff;text-align:center;padding:20px;font-family:monospace">
                    <h1>${BOT_NAME} - Scan QR Code</h1>
                    <p>Open WhatsApp > Linked Devices > Link Device</p>
                    <img src="${qrCodeData}" style="border:10px solid #25D366;border-radius:20px;margin:20px">
                    <p>QR expires in 20 seconds. Refresh if needed.</p>
                </body>
            </html>
        `)
    } else {
        res.send(`
            <html>
                <body style="background:#000;color:#fff;text-align:center;padding:50px;font-family:monospace">
                    <h1>${BOT_NAME} Starting...</h1>
                    <p>Generating QR code... Refresh in 5 seconds</p>
                    <script>setTimeout(()=>location.reload(),5000)</script>
                </body>
            </html>
        `)
    }
})

app.listen(process.env.PORT || 10000, () => console.log('VOID-MD Server running on port 10000'))
