module.exports = {
    name: 'hidetag',
    alias: ['h'],
    desc: 'Hidden tag all members',
    execute: async ({ sock, m, from, isGroup, args, reply }) => {
        await sock.sendMessage(from, { react: { text: '🔕', key: m.key } })
        if (!isGroup) return reply('Group only')
        const groupMetadata = await sock.groupMetadata(from)
        const members = groupMetadata.participants.map(p => p.id)
        const text = args.join(' ') || 'Hidden tag'
        await sock.sendMessage(from, { text, mentions: members })
    }
}
