module.exports = {
    name: 'kick',
    alias: ['remove'],
    desc: 'Remove user from group',
    execute: async ({ sock, from, isGroup, isOwner, mentioned, quoted, reply }) => {
        if (!isGroup) return reply('Group only')
        const groupMetadata = await sock.groupMetadata(from)
        const isAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin!== null
        if (!isAdmin &&!isOwner) return reply('Admin only')
        const user = mentioned[0] || (quoted? quoted.sender : null)
        if (!user) return reply('Tag or reply to user')
        await sock.groupParticipantsUpdate(from,, 'remove')
        await reply('Kicked')
    }
}
