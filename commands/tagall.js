module.exports = {
    name: 'tagall',
    alias: ['everyone', 'all'],
    desc: 'Tag all group members',
    category: 'admin',
    async execute({ reply, sock, from, isGroup, isOwner, args, m }) {
        if (!isGroup) return reply('*Group only* 💀')

        const groupMetadata = await sock.groupMetadata(from)
        const senderAdmin = groupMetadata.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))?.admin

        if (!senderAdmin &&!isOwner) return reply('*Admin/Owner only* 💀')

        const members = groupMetadata.participants.map(p => p.id)
        const text = args.join(' ') || '*Attention everyone* 💀'

        await sock.sendMessage(from, {
            text: `${text}\n\n${members.map(u => `@${u.split('@')[0]}`).join('\n')}`,
            mentions: members
        }, { quoted: m })
    }
}
