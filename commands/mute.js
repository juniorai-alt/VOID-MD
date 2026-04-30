module.exports = {
    name: 'mute',
    desc: 'Mute group for X minutes',
    category: 'admin',
    async execute({ reply, args, sock, from, isGroup, isOwner, m }) {
        if (!isGroup) return reply('*Group only* 💀')

        const groupMetadata = await sock.groupMetadata(from)
        const botAdmin = groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin
        const senderAdmin = groupMetadata.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))?.admin

        if (!botAdmin) return reply('*Bot must be admin* 💀')
        if (!senderAdmin &&!isOwner) return reply('*Admin/Owner only* 💀')

        const minutes = parseInt(args[0]) || 5
        if (minutes > 1440) return reply('*Max 1440 minutes (24h)* 💀')

        await sock.groupSettingUpdate(from, 'announcement')
        reply(`*Group muted for ${minutes} minutes* 💀`)

        setTimeout(async () => {
            try {
                await sock.groupSettingUpdate(from, 'not_announcement')
                await sock.sendMessage(from, { text: '*Group unmuted* 💀' })
            } catch (e) {
                console.log('Auto unmute failed:', e)
            }
        }, minutes * 60000)
    }
}
