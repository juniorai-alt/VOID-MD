module.exports = {
    name: 'groupinfo',
    alias: ['ginfo'],
    desc: 'Group details',
    execute: async ({ sock, m, from, isGroup, reply }) => {
        await sock.sendMessage(from, { react: { text: 'ℹ️', key: m.key } })
        if (!isGroup) return reply('This command only works in groups')
        const groupMetadata = await sock.groupMetadata(from)
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`)
        const desc = groupMetadata.desc || 'No description'
        await sock.sendMessage(from, {
            text: `*GROUP INFO*\n\n*Name:* ${groupMetadata.subject}\n*ID:* ${groupMetadata.id}\n*Members:* ${groupMetadata.participants.length}\n*Admins:* ${admins.join(', ')}\n*Description:* ${desc}`,
            mentions: groupMetadata.participants.map(p => p.id)
        })
    }
}
