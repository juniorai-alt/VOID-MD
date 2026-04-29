module.exports = {
    name: 'demote',
    desc: 'Remove admin',
    execute: async ({ sock, m, from, isGroup, isOwner, sender, mentioned, quoted, reply }) => {
        await sock.sendMessage(from, { react: { text: '⬇️', key: m.key } })
        if (!isGroup) return reply('Group only')
        const groupMetadata = await sock.groupMetadata(from)
        const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin!== null
        if (!isAdmin &&!isOwner) return reply('Admin only')
        const user = mentioned[0] || (quoted? quoted.sender : null)
        if (!user) return reply('Tag or reply to user')
        await sock.groupParticipantsUpdate(from, [user], 'demote') // ✅ Fixed
        await reply(`Demoted @${user.split('@')[0]}`)
    }
}
