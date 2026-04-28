const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const express = require('express')
const qrcode = require('qrcode')
const axios = require('axios')
const ytdl = require('ytdl-core')
const fs = require('fs')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')
const gTTS = require('gtts')
ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
const PORT = process.env.PORT || 3000

// === CONFIG ===
const BOT_NAME = 'VOID-MD'
const OWNER_NAME = 'YOUR NAME HERE' // CHANGE THIS
const OWNER_NUMBER = '2547xxxxxxxx' // CHANGE THIS - no + or spaces
const BOT_IMAGE = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
const VERSION = 'v3.1.0'
const PREFIX = '.'
// ==============

const startTime = Date.now()
let qrCode = null
let botConnected = false

// Database for group settings
let db = {
    antilink: {}, welcome: {}, warn: {}, mute: {}, antidelete: {},
    autosticker: {}, banword: {}, antispam: {}, banlist: {},
    autolikestatus: false, autoreact: {}, antilink_whitelist: {},
    customwelcome: {}, lockdown: {}, antiviewonce: {}, afk: {},
    anticall: {}, chatbot: {}, global_antiviewonce: false,
    antibot: {}, antiedit: {}, setbye: {}, welcomeimg: {},
    totalmsg: {}, msgcount: {}, bluetick: {},
    antigrouptag: {}, antigrouptag_whitelist: {}
}
if (fs.existsSync('./database.json')) db = JSON.parse(fs.readFileSync('./database.json'))
const saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2))

// Anti-spam tracker
let spamTracker = {}
// Store bot messages for purge
let botMessages = {}
// TicTacToe games
let tttGames = {}

const reactionEmojis = ['🔥', '💯', '😂', '❤️', '👍', '💀', '😭', '🤣', '✨', '💎']

async function connectBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['VOID-MD', 'Chrome', '1.0.0'],
        getMessage: async (key) => ({ conversation: 'VOID-MD' })
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if(qr) { qrCode = qr; botConnected = false }
        if(connection === 'close') {
            botConnected = false
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode!== DisconnectReason.loggedOut
            if(shouldReconnect) setTimeout(connectBot, 5000)
        } else if(connection === 'open') {
            console.log('✅ VOID-MD Connected!')
            botConnected = true; qrCode = null
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // Auto-decline calls
    sock.ev.on('call', async (call) => {
        if (db.anticall.on) {
            await sock.rejectCall(call.id, call.from)
            await sock.sendMessage(call.from, { text: '*ANTI-CALL* 📵\nCalls not allowed. You have been blocked.' })
            await sock.updateBlockStatus(call.from, 'block')
        }
    })

    // Auto-like status
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const m of messages) {
            if (m.key.remoteJid === 'status@broadcast' && db.autolikestatus) {
                if (!m.key.participant?.includes(sock.user.id.split(':')[0])) {
                    await sock.sendMessage(m.key.remoteJid, {
                        react: { text: '❤️', key: m.key }
                    })
                }
            }
        }
    })

    // Welcome/Bye + ban check + antibot
    sock.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await sock.groupMetadata(anu.id)
            for (let user of anu.participants) {
                // Anti-bot check
                if (anu.action === 'add' && db.antibot[anu.id] === 'on' && user.includes('bot')) {
                    const groupAdmins = metadata.participants.filter(p => p.admin).map(p => p.id)
                    const isBotAdmin = groupAdmins.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net')
                    if (isBotAdmin) {
                        await sock.groupParticipantsUpdate(anu.id, [user], 'remove')
                        await sock.sendMessage(anu.id, { text: `*ANTI-BOT* 🤖\n@${user.split('@')[0]} kicked - Bots not allowed`, mentions: [user] })
                    }
                    return
                }

                // Auto-kick banned users
                if (anu.action === 'add' && db.banlist[anu.id]?.includes(user)) {
                    const groupAdmins = metadata.participants.filter(p => p.admin).map(p => p.id)
                    const isBotAdmin = groupAdmins.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net')
                    if (isBotAdmin) {
                        await sock.groupParticipantsUpdate(anu.id, [user], 'remove')
                        await sock.sendMessage(anu.id, { text: `*BANLIST* 🚫\n@${user.split('@')[0]} is banned from this group`, mentions: [user] })
                    }
                    return
                }

                // Welcome message
                if (anu.action === 'add' && db.welcome[anu.id] === 'on') {
                    let welcomeMsg = db.customwelcome[anu.id] || `*WELCOME* 👋\n\n@user joined *${metadata.subject}*\n\nMembers: ${metadata.participants.length}\nRead group rules!`
                    welcomeMsg = welcomeMsg.replace('@user', `@${user.split('@')[0]}`).replace('@group', metadata.subject)

                    if (db.welcomeimg[anu.id]) {
                        await sock.sendMessage(anu.id, {
                            image: { url: db.welcomeimg[anu.id] },
                            caption: welcomeMsg,
                            mentions: [user]
                        })
                    } else {
                        await sock.sendMessage(anu.id, {
                            text: welcomeMsg,
                            mentions: [user]
                        })
                    }
                }

                // Goodbye message
                if (anu.action === 'remove' && db.setbye[anu.id]) {
                    let byeMsg = db.setbye[anu.id].replace('@user', `@${user.split('@')[0]}`).replace('@group', metadata.subject)
                    await sock.sendMessage(anu.id, {
                        text: byeMsg,
                        mentions: [user]
                    })
                }
            }
        } catch (e) {}
    })

    // Anti-delete + Anti-edit
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.message?.editedMessage) {
                const jid = update.key.remoteJid
                if (db.antiedit[jid] === 'on') {
                    await sock.sendMessage(jid, { text: `*ANTI-EDIT* ✏️\n\nMessage from @${update.key.participant?.split('@')[0]} was edited`, mentions: [update.key.participant] })
                }
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe || m.key.remoteJid === 'status@broadcast') {
            if (m.key.fromMe && botMessages[m.key.remoteJid]) {
                botMessages[m.key.remoteJid].push(m.key)
                if (botMessages[m.key.remoteJid].length > 50) botMessages[m.key.remoteJid].shift()
            }
            return
        }

        const from = m.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = m.key.participant || from
        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ''
        const args = body.trim().split(/ +/).slice(1)
        const cmd = body.trim().toLowerCase().split(' ')[0]
        const q = args.join(' ')
        const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage

        // Auto-blue tick specific users
        if (db.bluetick[sender] === 'on') {
            await sock.readMessages([m.key])
        }

        // Message counter
        if (isGroup) {
            if (!db.msgcount[from]) db.msgcount[from] = {}
            if (!db.msgcount[from][sender]) db.msgcount[from][sender] = 0
            db.msgcount[from][sender]++
            if (!db.totalmsg[from]) db.totalmsg[from] = 0
            db.totalmsg[from]++
            saveDB()
        }

        const uptime = () => {
            let s = Math.floor((Date.now() - startTime) / 1000)
            let h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60)
            s = Math.floor(s % 60)
            return `${h}h ${m}m ${s}s`
        }

        const timeEAT = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })

        let groupAdmins = [], isBotAdmin = false, isSenderAdmin = false, isOwner = sender.includes(OWNER_NUMBER)
        let groupMetadata = null
        if (isGroup) {
            groupMetadata = await sock.groupMetadata(from)
            groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id)
            isBotAdmin = groupAdmins.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net')
            isSenderAdmin = groupAdmins.includes(sender)
        }

        // AFK check
        if (mentioned.length > 0) {
            for (let user of mentioned) {
                if (db.afk[user]) {
                    const afkTime = Math.floor((Date.now() - db.afk[user].time) / 60000)
                    await sock.sendMessage(from, {
                        text: `*AFK* 😴\n@${user.split('@')[0]} is AFK\nReason: ${db.afk[user].reason}\nSince: ${afkTime}m ago`,
                        mentions: [user]
                    }, { quoted: m })
                }
            }
        }

        // Remove AFK if user sends message
        if (db.afk[sender]) {
            delete db.afk[sender]; saveDB()
            await sock.sendMessage(from, { text: `Welcome back @${sender.split('@')[0]}! AFK removed.`, mentions: [sender] }, { quoted: m })
        }

        // Anti-viewonce
        if (isGroup && (db.antiviewonce[from] === 'on' || db.global_antiviewonce)) {
            const viewOnce = m.message.viewOnceMessageV2?.message || m.message.viewOnceMessage?.message
            if (viewOnce) {
                const type = viewOnce.imageMessage? 'image' : 'video'
                const stream = await downloadContentFromMessage(viewOnce[type + 'Message'], type)
                let buffer = Buffer.from([])
                for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
                await sock.sendMessage(from, {
                    [type]: buffer,
                    caption: `*ANTI-VIEWONCE* 👁️\nFrom: @${sender.split('@')[0]}`,
                    mentions: [sender]
                })
            }
        }

        // Lockdown check
        if (isGroup && db.lockdown[from] === 'on' &&!isSenderAdmin &&!isOwner) {
            await sock.sendMessage(from, { delete: m.key })
            return
        }

        // Anti-group tag
        if (isGroup && db.antigrouptag[from] === 'on' &&!isSenderAdmin &&!isOwner) {
            const whitelist = db.antigrouptag_whitelist[from] || []
            if (whitelist.includes(sender)) return

            const groupName = groupMetadata?.subject?.toLowerCase()
            const hasGroupMention = mentioned.includes(from) || body.toLowerCase().includes('@everyone') || body.toLowerCase().includes('@all') || (groupName && body.toLowerCase().includes('@' + groupName))

            if (hasGroupMention) {
                await sock.sendMessage(from, { delete: m.key })
                await sock.sendMessage(from, {
                    text: `*ANTI-GROUP-TAG* 🚫\n@${sender.split('@')[0]} tagged the group! Kicked.`,
                    mentions: [sender]
                })
                if (isBotAdmin) await sock.groupParticipantsUpdate(from, [sender], 'remove')
                return
            }
        }

        // Anti-link with whitelist
        if (isGroup && db.antilink[from] === 'on' &&!isSenderAdmin &&!isOwner) {
            const whitelist = db.antilink_whitelist[from] || []
            const hasLink = body.match(/chat\.whatsapp\.com|https?:\/\/|www\.|t\.me|bit\.ly/i)
            const isWhitelisted = whitelist.some(domain => body.includes(domain))
            if (hasLink &&!isWhitelisted) {
                await sock.sendMessage(from, { delete: m.key })
                await sock.sendMessage(from, { text: `*ANTI-LINK* ⚠️\n@${sender.split('@')[0]} links not allowed!`, mentions: [sender] })
                if (isBotAdmin) await sock.groupParticipantsUpdate(from, [sender], 'remove')
                return
            }
        }

        // Banword check
        if (isGroup && db.banword[from]?.length > 0 &&!isSenderAdmin &&!isOwner) {
            const words = db.banword[from]
            if (words.some(word => body.toLowerCase().includes(word.toLowerCase()))) {
                await sock.sendMessage(from, { delete: m.key })
                await sock.sendMessage(from, { text: `*BANWORD* 🚫\n@${sender.split('@')[0]} banned word detected!`, mentions: [sender] })
                return
            }
        }

        // Anti-spam check
        if (isGroup && db.antispam[from] === 'on' &&!isSenderAdmin &&!isOwner) {
            if (!spamTracker[from]) spamTracker[from] = {}
            if (!spamTracker[from][sender]) spamTracker[from][sender] = []
            spamTracker[from][sender].push(Date.now())
            spamTracker[from][sender] = spamTracker[from][sender].filter(t => Date.now() - t < 10000)
            if (spamTracker[from][sender].length >= 5) {
                await sock.sendMessage(from, { delete: m.key })
                await sock.sendMessage(from, { text: `*ANTI-SPAM* 🚫\n@${sender.split('@')[0]} stop spamming!`, mentions: [sender] })
                if (isBotAdmin) await sock.groupParticipantsUpdate(from, [sender], 'remove')
                delete spamTracker[from][sender]
                return
            }
        }

        // Mute check
        if (isGroup && db.mute[from]?.includes(sender) &&!isSenderAdmin) {
            await sock.sendMessage(from, { delete: m.key })
            return
        }

        // Chatbot auto-reply
        if (isGroup && db.chatbot[from] === 'on' &&!body.startsWith(PREFIX) && body.toLowerCase().includes('void')) {
            try {
                const { data } = await axios.get(`https://api.dreaded.site/api/chatgpt?text=${encodeURIComponent(body)}`)
                await sock.sendMessage(from, { text: data.result }, { quoted: m })
            } catch {}
        }

        // Auto-react
        if (isGroup && db.autoreact[from] === 'on' &&!body.startsWith(PREFIX) && Math.random() > 0.7) {
            const emoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)]
            await sock.sendMessage(from, { react: { text: emoji, key: m.key } })
        }

        // Auto-sticker
        if (isGroup && db.autosticker[from] === 'on' &&!body.startsWith(PREFIX)) {
            const mime = m.message.imageMessage?.mimetype || m.message.videoMessage?.mimetype
            if (mime) {
                try {
                    const stream = await downloadContentFromMessage(m.message.imageMessage || m.message.videoMessage, mime.includes('image')? 'image' : 'video')
                    let buffer = Buffer.from([])
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
                    const sent = await sock.sendMessage(from, { sticker: buffer }, { quoted: m })
                    if (!botMessages[from]) botMessages[from] = []
                    botMessages[from].push(sent.key)
                } catch {}
            }
        }

        // TicTacToe game handler
        if (tttGames[from] && body.match(/^[1-9]$/)) {
            const game = tttGames[from]
            const pos = parseInt(body) - 1
            if (game.board[pos] === ' ') {
                game.board[pos] = sender === game.player1? 'X' : 'O'
                game.turn = game.turn === game.player1? game.player2 : game.player1
                const display = game.board.map((v, i) => (i % 3 === 2? v + '\n' : v + ' | ')).join('')
                await sock.sendMessage(from, { text: `*TIC-TAC-TOE* ❌⭕\n\n${display}\n\nTurn: @${game.turn.split('@')[0]}`, mentions: [game.player1, game.player2] })

                const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
                for (let w of wins) {
                    if (game.board[w[0]]!== ' ' && game.board[w[0]] === game.board[w[1]] && game.board[w[1]] === game.board[w[2]]) {
                        await sock.sendMessage(from, { text: `🎉 @${sender.split('@')[0]} WINS!`, mentions: [sender] })
                        delete tttGames[from]
                        return
                    }
                }
                if (!game.board.includes(' ')) {
                    await sock.sendMessage(from, { text: '🤝 DRAW!' })
                    delete tttGames[from]
                }
            }
            return
        }

        try {
            switch (cmd) {
                case `${PREFIX}menu`:
                case `${PREFIX}hidemenu`:
                    const menuText = `
╭━━━『 ${BOT_NAME} 』━━━╮
┃ ⚡ *Owner:* ${OWNER_NAME}
┃ 🕐 *Time:* ${timeEAT}
┃ ⏱️ *Uptime:* ${uptime()}
┃ 📊 *Commands:* 104
╰━━━━━━━━━━━━━━━━━━━━╯

*📥 DOWNLOAD*
${PREFIX}play <song> - YouTube audio
${PREFIX}ytmp4 <link> - YouTube video
${PREFIX}tiktok <link> - TikTok no WM

*🛠️ TOOLS*
${PREFIX}sticker - Image to sticker
${PREFIX}toimg - Sticker to image
${PREFIX}toaudio - Video to audio
${PREFIX}volume <num> - Adjust volume
${PREFIX}ai <text> - Ask AI
${PREFIX}poll Q | Opt1 | Opt2 - Poll
${PREFIX}getpp @user - Get profile pic
${PREFIX}getjid - Get JID
${PREFIX}calc <eq> - Calculator
${PREFIX}ss <url> - Website screenshot
${PREFIX}shorturl <link> - Shorten URL
${PREFIX}translate <lang> <text> - Translate
${PREFIX}lyrics <song> - Get lyrics
${PREFIX}weather <city> - Weather info
${PREFIX}fact - Random fact
${PREFIX}joke - Random joke
${PREFIX}quote - Random quote
${PREFIX}img <query> - Image search
${PREFIX}ytsearch <query> - YouTube search
${PREFIX}gitclone <repo> - Clone repo
${PREFIX}base64 encode/decode <text> - Base64
${PREFIX}qr <text> - Generate QR
${PREFIX}readqr - Read QR
${PREFIX}tourl - Image/video to URL

*🎮 FUN & GAMES*
${PREFIX}tictactoe @user - TicTacToe
${PREFIX}rps <choice> - Rock Paper Scissors
${PREFIX}roll - Roll dice
${PREFIX}coinflip - Flip coin
${PREFIX}8ball <question> - Magic 8ball
${PREFIX}ship @user1 @user2 - Love calc
${PREFIX}meme - Random meme

*🎭 FAKE ACTIONS*
${PREFIX}fakerecording - Fake recording
${PREFIX}faktyping - Fake typing
${PREFIX}fakeonline - Appear online
${PREFIX}fakeoffline - Appear offline

*👥 GROUP ADMIN*
${PREFIX}antilink on/off - Anti-link
${PREFIX}antidelete on/off/msg/media - Recover deleted
${PREFIX}antispam on/off - Anti-spam kick
${PREFIX}antiviewonce on/off/all - Save viewonce
${PREFIX}anticall on/off - Block calls
${PREFIX}antibot on/off - Kick bots
${PREFIX}antiedit on/off - Detect edits
${PREFIX}antigrouptag on/off - Kick group taggers
${PREFIX}antigrouptag whitelist add/del - Exempt users
${PREFIX}chatbot on/off - AI auto-reply
${PREFIX}autosticker on/off - Auto sticker
${PREFIX}autoreact on/off - Auto react
${PREFIX}autolikestatus on/off - Like status
${PREFIX}banword add/del/list - Ban words
${PREFIX}antilink whitelist add/del - Whitelist
${PREFIX}ban/unban @user - Ban from group
${PREFIX}banlist - Show banned
${PREFIX}listban - Global ban list
${PREFIX}welcome on/off - Welcome msg
${PREFIX}setwelcome <msg> - Custom welcome
${PREFIX}setwelcome image - Set welcome img
${PREFIX}setbye <msg> - Goodbye msg
${PREFIX}setdesc <text> - Group description
${PREFIX}setname <text> - Group name
${PREFIX}grouplink - Get group link
${PREFIX}linkgroup - All group links
${PREFIX}inspect <link> - Link info
${PREFIX}join <link> - Join group [Owner]
${PREFIX}leave - Leave group [Admin]
${PREFIX}listonline - Online members
${PREFIX}totalmsg - Message count
${PREFIX}topmember - Most active
${PREFIX}afk <reason> - Set AFK
${PREFIX}delafk - Remove AFK
${PREFIX}vv - Save viewonce manually
${PREFIX}warn @user - Warn user
${PREFIX}delwarn @user - Clear warns
${PREFIX}checkwarn @user - Check warns
${PREFIX}warnreset - Reset all warns
${PREFIX}mute/unmute @user
${PREFIX}kick @user - Remove
${PREFIX}kickall - Remove all [Owner]
${PREFIX}promote/demote @user
${PREFIX}demoteall - Demote all [Owner]
${PREFIX}group open/close
${PREFIX}lockdown/unlock - Lock group
${PREFIX}setpp - Set group pic
${PREFIX}revoke - Reset group link
${PREFIX}tagall / ${PREFIX}hidetag
${PREFIX}hidetag all - Silent tag all
${PREFIX}admins - Tag admins
${PREFIX}userinfo @user - User info
${PREFIX}purge - Delete bot msgs
${PREFIX}broadcast <text> - Broadcast [Owner]
${PREFIX}bluetick @user - Auto-read user
${PREFIX}unbluetick @user - Stop auto-read
${PREFIX}blueticklist - List auto-read users
${PREFIX}ping - Speed

_Powered by VOID-MD ${VERSION}_`

                    if (cmd === `${PREFIX}hidemenu`) {
                        await sock.sendMessage(sender, { image: { url: BOT_IMAGE }, caption: menuText })
                        await sock.sendMessage(from, { text: '📩 Menu sent to your DM' }, { quoted: m })
                    } else {
                        const sent = await sock.sendMessage(from, { image: { url: BOT_IMAGE }, caption: menuText })
                        if (!botMessages[from]) botMessages[from] = []
                        botMessages[from].push(sent.key)
                    }
                    break

                case `${PREFIX}ping`:
                    const start = Date.now()
                    await sock.sendMessage(from, { text: `*PONG!*\n📊 Speed: ${Date.now() - start}ms\n⏱️ Uptime: ${uptime()}\n📊 Commands: 104` })
                    break

                case `${PREFIX}bluetick`:
                    if (!isGroup ||!isSenderAdmin) return sock.sendMessage(from, { text: 'Admin only' })
                    if (!mentioned[0]) return sock.sendMessage(from, { text: `Tag user: ${PREFIX}bluetick @user` })
                    if (!db.bluetick) db.bluetick = {}
                    db.bluetick[mentioned[0]] = 'on'; saveDB()
                    await sock.sendMessage(from, {
                        text: `✅ *BLUE TICK ENABLED* ✓✓\n\n@${mentioned[0].split('@')[0]} messages will be auto-read`,
                        mentions: [mentioned[0]]
                    })
                    break

                case `${PREFIX}unbluetick`:
                    if (!isGroup ||!isSenderAdmin) return sock.sendMessage(from, { text: 'Admin only' })
                    if (!mentioned[0]) return sock.sendMessage(from, { text: `Tag user: ${PREFIX}unbluetick @user` })
                    if (db.bluetick[mentioned[0]]) {
                        delete db.bluetick[mentioned[0]]; saveDB()
                        await sock.sendMessage(from, {
                            text: `✅ *BLUE TICK DISABLED*\n\n@${mentioned[0].split('@')[0]} messages won't be auto-read`,
                            mentions: [mentioned[0]]
                        })
                    }
                    break

                case `${PREFIX}blueticklist`:
                    if (!isGroup ||!isSenderAdmin) return sock.sendMessage(from, { text: 'Admin only' })
                    const blueticked = Object.keys(db.bluetick || {}).filter(u => db.bluetick[u] === 'on')
                    const listText = blueticked.length > 0? blueticked.map((u, i) => `${i+1}. @${u.split('@')[0]}`).join('\n') : 'No users'
                    await sock.sendMessage(from, {
                        text: `*BLUE TICK LIST* ✓✓\n\n${listText}`,
                        mentions: blueticked
                    })
                    break

                case `${PREFIX}antigrouptag`:
                    if (!isGroup ||!isSenderAdmin) return sock.sendMessage(from, { text: 'Admin only' })

                    if (args[0] === 'whitelist') {
                        if (!db.antigrouptag_whitelist[from]) db.antigrouptag_whitelist[from] = []

                        if (args[1] === 'add' && mentioned[0]) {
                            if (!db.antigrouptag_whitelist[from].includes(mentioned[0])) {
                                db.antigrouptag_whitelist[from].push(mentioned[0]); saveDB()
                                await sock.sendMessage(from, {
                                    text: `✅ *WHITELISTED*\n@${mentioned[0].split('@')[0]} can now tag the group`,
                                    mentions: [mentioned[0]]
                                })
                            } else {
                                await sock.sendMessage(from, { text: 'User already whitelisted' })
                            }
                        } else if (args[1] === 'del' && mentioned[0]) {
                            db.antigrouptag_whitelist[from] = db.antigrouptag_whitelist[from].filter(u => u!== mentioned[0]); saveDB()
                            await sock.sendMessage(from, {
                                text: `✅ *REMOVED*\n@${mentioned[0].split('@')[0]} removed from whitelist`,
                                mentions: [mentioned[0]]
                            })
                        } else if (args[1] === 'list') {
                            const users = db.antigrouptag_whitelist[from] || []
                            const listText = users.length > 0? users.map((u, i) => `${i+1}. @${u.split('@')[0]}`).join('\n') : 'None'
                            await sock.sendMessage(from, {
                                text: `*WHITELIST* ✅\n\n${listText}`,
                                mentions: users
                            })
                        } else {
                            await sock.sendMessage(from, { text: `Use: ${PREFIX}antigrouptag whitelist add/del/list @user` })
                        }
                    } else if (args[0] === 'on') {
                        db.antigrouptag[from] = 'on'; saveDB()
                        await sock.sendMessage(from, { text: '✅ *Anti-Group-Tag enabled*\nAnyone who mentions @everyone/@all/@groupname gets kicked\n\nUse whitelist to exempt users' })
                    } else if (args[0] === 'off') {
                        db.antigrouptag[from] = 'off'; saveDB()
                        await sock.sendMessage(from, { text: '✅ *Anti-Group-Tag disabled*' })
                    } else {
                        await sock.sendMessage(from, { text: `Anti-Group-Tag: ${db.antigrouptag[from] === 'on'? 'ON' : 'OFF'}\n\nUse: ${PREFIX}antigrouptag on/off\n${PREFIX}antigrouptag whitelist add/del/list @user` })
                    }
                    break

                // ADD YOUR OTHER 100 COMMANDS HERE FROM PREVIOUS CODE
                // Due to length, I'm showing the new ones. Merge with your existing v3.0 code

            }
        } catch (e) {
            console.log(e)
        }
    })
}

app.get('/', (req, res) => {
    if (botConnected) {
        res.send(`<h1>✅ ${BOT_NAME} ${VERSION} Connected!</h1>`)
    } else if (qrCode) {
        qrcode.toDataURL(qrCode, (err, url) => {
            res.send(`<h1>Scan QR Code</h1><img src="${url}">`)
        })
    } else {
        res.send(`<h1>Starting ${BOT_NAME}...</h1>`)
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectBot()
})
