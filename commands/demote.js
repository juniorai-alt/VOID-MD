module.exports = {
    name: 'demote',
    alias: ['unadmin'],
    desc: 'Demote admin to member',
    category: 'admin',
    async execute({ reply, sock, from, isGroup, isOwner, mentioned, quoted, m }) {
        if (!isGroup) return reply('*Group only* 💀')

        const groupMetadata = await sock.groupMetadata(from)
        const botAdmin = groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin
        const senderAdmin = groupMetadata.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))?.admin

        if (!botAdmin) return reply('*Bot must be admin* 💀')
        if (!senderAdmin &&!isOwner) return reply('*Admin/Owner only* 💀')

        let target = mentioned[0] || quoted?.sender
        if (!target) return reply('*Tag or reply to user* 💀')

        try {
            await sock.groupParticipantsUpdate(from, [target], 'demote')
            reply(`*Demoted* @${target.split('@')[0]} 💀`, { mentions: [target] })
        } catch (e) {
            reply(`*Failed:* ${e.message} 💀`)
        }
    }
}
