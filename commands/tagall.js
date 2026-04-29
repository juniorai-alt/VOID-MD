module.exports = {
    name: 'tagall',
    desc: 'Tag all group members',
    execute: async ({ sock, m, from, isGroup, args, reply }) => {
        await sock.sendMessage(from, { react: { text: '📢', key: m.key } })
        if (!isGroup) return reply('Group only')
        const groupMetadata = await sock.groupMetadata(from)
        const members = groupMetadata.participants.map(p => p.id)
        const text = args.join(' ') || 'Attention everyone!'
        await sock.sendMessage(from, { text: `📢 *TAG ALL*\n\n${text}\n\n${members.map(u => `@${u.split('@')[0]}`).join(' ')}`, mentions: members })
    }
}
