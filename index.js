const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const express = require('express')
const qrcode = require('qrcode')
const fs = require('fs')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3000

// === CONFIG ===
const BOT_NAME = 'VOID-MD'
const OWNER_NAME = 'Mr Void'
const OWNER_NUMBER = '254112843071'
const BOT_IMAGE = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
const VERSION = 'v1.0.0'
const PREFIX = '.'
// =============================

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
        if (!m.message) return // Removed key.fromMe check so bot can respond to itself

        const from = m.key.remoteJid
        const sender = m.key.participant || m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ''
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage

        if (!body.startsWith(PREFIX)) return

        const args = body.slice(PREFIX.length).trim().split(' ')
        const cmd = args.shift().toLowerCase()

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

        const reply = async (text) => await sock.sendMessage(from, { text }, { quoted: m })

        // ===== COMMANDS - EVERYONE INCLUDING BOT NUMBER =====

        if (cmd === 'menu' || cmd === 'help') {
            const menu = `
╭━━━『 ${BOT_NAME} 』━━━╮
┃ ⚡ *Owner:* ${OWNER_NAME}
┃ 🕐 *Time:* ${timeEAT} EAT
┃ ⏱️ *Uptime:* ${uptime()}
┃ 📍 *Version:* ${VERSION}
┃ 🤖 *Prefix:* ${PREFIX}
╰━━━━━━━━━━━━━━━━━━━━╯

*MAIN COMMANDS*
${PREFIX}menu - Show this menu
${PREFIX}ping - Check bot speed
${PREFIX}owner - Owner info
${PREFIX}time - Current EAT time
${PREFIX}runtime - Bot uptime

*FUN COMMANDS*
${PREFIX}say <text> - Bot repeats text
${PREFIX}joke - Random joke

*MEDIA COMMANDS*
${PREFIX}sticker - Image/Video to sticker
${PREFIX}play <song> - Download song
${PREFIX}tiktokdl <link> - Download TikTok

*GROUP COMMANDS*
${PREFIX}tagall - Tag everyone
${PREFIX}hidetag <text> - Hidden tag

_Powered by VOID-MD_`
            await sock.sendMessage(from, { image: { url: BOT_IMAGE }, caption: menu })
        }

        else if (cmd === 'ping') {
            const start = Date.now()
            await sock.sendMessage(from, { text: `*VOID-MD SPEED*\n📊 Response: ${Date.now() - start}ms` })
        }

        else if (cmd === 'owner') {
            await sock.sendMessage(from, { text: `*VOID-MD OWNER*\n👑 Name: ${OWNER_NAME}\n📱 Contact: wa.me/${OWNER_NUMBER}` })
        }

        else if (cmd === 'time' || cmd === 'date') {
            await sock.sendMessage(from, { text: `*EAST AFRICA TIME*\n🕐 ${timeEAT}` })
        }

        else if (cmd === 'runtime' || cmd === 'uptime') {
            await sock.sendMessage(from, { text: `*BOT UPTIME*\n⏱️ ${uptime()}` })
        }

        else if (cmd === 'say') {
            const text = args.join(' ')
            if (!text) return reply(`Usage: ${PREFIX}say Hello World`)
            await reply(text)
        }

        else if (cmd === 'joke') {
            const jokes = [
                "Why do programmers prefer dark mode? Because light attracts bugs!",
                "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
                "Why did the developer go broke? Because he used up all his cache.",
                "What's a programmer's favorite hangout place? Foo Bar."
            ]
            await reply(jokes[Math.floor(Math.random() * jokes.length)])
        }

        else if (cmd === 'sticker' || cmd === 's') {
            const mediaMessage = m.message.imageMessage || m.message.videoMessage || quoted?.imageMessage || quoted?.videoMessage
            if (!mediaMessage) return reply(`Reply to an image/video with ${PREFIX}sticker`)

            try {
                await reply('Creating sticker...')
                const buffer = await sock.downloadMediaMessage(m.message.imageMessage || m.message.videoMessage? m : { key: m.key, message: quoted })
                await sock.sendMessage(from, { sticker: buffer }, { quoted: m })
            } catch (e) {
                reply('Failed to create sticker. Try smaller image/video.')
            }
        }

        else if (cmd === 'play' || cmd === 'song') {
            const query = args.join(' ')
            if (!query) return reply(`Usage: ${PREFIX}play Alan Walker Faded`)

            try {
                await reply(`Searching: ${query}...`)
                const res = await axios.get(`https://api.akuari.my.id/downloader/ytplay?query=${encodeURIComponent(query)}`)
                const data = res.data.respon
                await sock.sendMessage(from, {
                    audio: { url: data.urlmp3 },
                    mimetype: 'audio/mpeg',
                    fileName: `${data.title}.mp3`
                }, { quoted: m })
            } catch (e) {
                reply('Failed to download. Try different song name.')
            }
        }

        else if (cmd === 'tiktokdl' || cmd === 'tt') {
            const url = args[0]
            if (!url ||!url.includes('tiktok')) return reply(`Usage: ${PREFIX}tiktokdl <tiktok link>`)

            try {
                await reply('Downloading TikTok...')
                const res = await axios.get(`https://api.akuari.my.id/downloader/tiktok?link=${url}`)
                const video = res.data.respon.video
                await sock.sendMessage(from, { video: { url: video }, caption: 'Done by VOID-MD' }, { quoted: m })
            } catch (e) {
                reply('Failed to download. Link might be private or invalid.')
            }
        }

        else if (cmd === 'tagall' || cmd === 'everyone') {
            if (!from.endsWith('@g.us')) return reply('This command only works in groups')
            const groupMetadata = await sock.groupMetadata(from)
            const participants = groupMetadata.participants
            let text = `*TAG ALL*\n`
            let mentions = []
            for (let mem of participants) {
                text += `@${mem.id.split('@')[0]} `
                mentions.push(mem.id)
            }
            await sock.sendMessage(from, { text, mentions })
        }

        else if (cmd === 'hidetag') {
            if (!from.endsWith('@g.us')) return reply('This command only works in groups')
            const groupMetadata = await sock.groupMetadata(from)
            const participants = groupMetadata.participants.map(u => u.id)
            const text = args.join(' ') || 'Hidden tag'
            await sock.sendMessage(from, { text, mentions: participants })
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
