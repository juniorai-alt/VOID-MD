module.exports = {
    name: 'kick',
    alias: ['remove'],
    desc: 'Kick user from group',
    category: 'admin',
    async execute({ reply, sock, from, isGroup, isOwner, mentioned, quoted, m }) {
        if (!isGroup) return reply('*Group only command* 💀')

        const groupMetadata = await sock.groupMetadata(from)
        const botAdmin = groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin
        const senderAdmin = groupMetadata.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))?.admin

        if (!botAdmin) return reply('*Bot must be admin* 💀')
        if (!senderAdmin &&!isOwner) return reply('*Admin/Owner only* 💀')

        let target = mentioned[0] || quoted?.sender
        if (!target) return reply('*Tag or reply to user* 💀\nExample:.kick @user')

        if (target === sock.user.id) return reply('*Cannot kick myself* 💀')

        try {
            await sock.groupParticipantsUpdate(from, [target], 'remove')
            reply(`*Kicked* @${target.split('@')[0]} 💀`, { mentions: [target] })
        } catch (e) {
            reply(`*Failed to kick:* ${e.message} 💀`)
        }
    }
}
