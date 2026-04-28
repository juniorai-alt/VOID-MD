const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const express = require('express')
const qrcode = require('qrcode')

const app = express()
const PORT = process.env.PORT || 3000

const BOT_NAME = 'UNBORN-BOT V1.0'
const OWNER_NAME = 'UNBORN GEN-JUNIOR'
const OWNER_NUMBER = '254112843071' // CHANGE THIS TO YOUR NUMBER
const BOT_IMAGE = 'https://i.imgur.com/4M7IWwP.jpg' // You can change this image
const startTime = Date.now()
let qrCode = null
let botConnected = false

async function connectBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const { version } = await fetchLatestBaileysVersion()
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['UNBORN-BOT', 'Chrome', '1.0.0']
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
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) setTimeout(connectBot, 5000)
        } else if(connection === 'open') {
            console.log('✅ Bot Connected!')
            botConnected = true
            qrCode = null
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        
        const from = m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || ''
        const cmd = body.toLowerCase().split(' ')[0]
        
        const uptime = () => {
            let s = Math.floor((Date.now() - startTime) / 1000)
            let h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60)
            s = Math.floor(s % 60)
            return `${h}h ${m}m ${s}s`
        }
        
        const timeEAT = new Date().toLocaleString('en-KE', {
            timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', 
            day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
        })

        if (cmd === '.menu') {
            const menu = `
┏━━━❖ ❤️🔥 ${BOT_NAME} 🔥❤️ ❖━━━┓
┃ 👑 Owner: ${OWNER_NAME}
┃ 🕐 ${timeEAT} EAT
┃ ⏱️ Uptime: ${uptime()}
┃ 🌐 Hosted on Render
┗━━━━━━━━━━━━━━━━━━━━━┛

*COMMANDS*
.menu - Show menu
.ping - Bot speed
.owner - Contact dev
.time - Current time
.vcf - 404 ERROR VCF app

Developed by UNBORN GEN-JUNIOR AI`
            await sock.sendMessage(from, { image: { url: BOT_IMAGE }, caption: menu })
        }
        else if (cmd === '.ping') {
            const start = Date.now()
            await sock.sendMessage(from, { text: `📊 Speed: ${Date.now() - start}ms` })
        }
        else if (cmd === '.owner') {
            await sock.sendMessage(from, { text: `👑 *Owner*: ${OWNER_NAME}\n📱 wa.me/${OWNER_NUMBER}` })
        }
        else if (cmd === '.time') {
            await sock.sendMessage(from, { text: `🕐 *EAT Time*\n${timeEAT}` })
        }
        else if (cmd === '.vcf') {
            await sock.sendMessage(from, { text: `🔥 *404 ERROR VCF* 🔥\n\nhttps://excellpro.netlify.app` })
        }
    })
}

app.get('/', async (req, res) => {
    if (botConnected) {
        res.send('<h1>✅ UNBORN-BOT is online!</h1><p>Send.menu to your bot number</p>')
    } else if (qrCode) {
        const qrImage = await qrcode.toDataURL(qrCode)
        res.send(`<h1>Scan QR to Connect Bot</h1><p>WhatsApp → Linked Devices → Link Device</p><img src="${qrImage}"><script>setTimeout(() => location.reload(), 20000)</script>`)
    } else {
        res.send('<h1>Starting bot...</h1><p>Refresh in 15 seconds</p><script>setTimeout(() => location.reload(), 15000)</script>')
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectBot()
})
