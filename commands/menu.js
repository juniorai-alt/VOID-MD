module.exports = {
    name: 'menu',
    alias: ['help', 'commands', 'list'],
    desc: 'Display bot command list',
    execute: async ({ sock, m, from, PREFIX, BOT_NAME, OWNER_NAME, VERSION, BOT_IMAGE, uptime, reply }) => {
        await sock.sendMessage(from, { react: { text: '✨', key: m.key } })

        const runtime = uptime()
        const date = new Date().toLocaleDateString('en-KE', { 
            timeZone: 'Africa/Nairobi',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        const time = new Date().toLocaleTimeString('en-KE', { 
            timeZone: 'Africa/Nairobi',
            hour: '2-digit',
            minute: '2-digit'
        })

        const menuText = `╭═══〘 *${BOT_NAME}* 〙═══⊷❍
┃ ╭──────────────
┃ │ 👑 *Owner:* ${OWNER_NAME}
┃ │ ⚡ *Prefix:* [ ${PREFIX} ]
┃ │ 🕒 *Uptime:* ${runtime}
┃ │ 📅 *Date:* ${date}
┃ │ 🕐 *Time:* ${time}
┃ │ 🔖 *Version:* ${VERSION}
┃ ╰──────────────
╰══════════════════⊷❍

╭═══〘 *GENERAL CMDS* 〙═══⊷❍
┃ 〄 ${PREFIX}menu - Display this menu
┃ 〄 ${PREFIX}ping - Check bot speed
┃ 〄 ${PREFIX}owner - Get owner contact
┃ 〄 ${PREFIX}alive - Check bot status
╰══════════════════⊷❍

╭═══〘 *GROUP CMDS* 〙═══⊷❍
┃ 〄 ${PREFIX}groupinfo - Group details
┃ 〄 ${PREFIX}tagall <text> - Tag everyone
┃ 〄 ${PREFIX}hidetag <text> - Hidden tag
┃ 〄 ${PREFIX}kick @user - Remove user [Admin]
┃ 〄 ${PREFIX}promote @user - Make admin [Admin]
┃ 〄 ${PREFIX}demote @user - Remove admin [Admin]
┃ 〄 ${PREFIX}settings - Show all toggles
╰══════════════════⊷❍

╭═══〘 *TOGGLE FEATURES* 〙═══⊷❍
┃ 〄 ${PREFIX}welcome on/off - Welcome msgs
┃ 〄 ${PREFIX}antilink on/off - Anti link kick
┃ 〄 ${PREFIX}autoread on/off - Auto read msgs
┃ 〄 ${PREFIX}antidelete on/off - Recover msgs
┃ 〄 ${PREFIX}chatbot on/off - Auto reply AI
┃ 〄 ${PREFIX}autoview on/off - View statuses
┃ 〄 ${PREFIX}autotyping on/off - Show typing...
┃ 〄 ${PREFIX}autorecording on/off - Recording...
┃ 〄 ${PREFIX}autonline on/off - Online 24/7
╰══════════════════⊷❍

╭═══〘 *NOTE* 〙═══⊷❍
┃ ❖ Type ${PREFIX}help <command> for details
┃ ❖ Commands marked [Admin] need admin
┃ ❖ All toggles are now public
╰══════════════════⊷❍

_Powered by VOID-MD 💀_`

        await sock.sendMessage(from, {
            image: { url: BOT_IMAGE },
            caption: menuText,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: `${BOT_NAME} ${VERSION}`,
                    body: `Runtime: ${runtime}`,
                    thumbnailUrl: BOT_IMAGE,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })
    }
  }
