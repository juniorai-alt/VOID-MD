module.exports = {
    name: 'hidetag',
    alias: ['ht'],
    desc: 'Tag all members without showing',
    category: 'admin',
    async execute({ reply, sock, from, isGroup, isOwner, args, m }) {
        if (!isGroup) return reply('*Group only* 💀')

        const groupMetadata = await sock.groupMetadata(from)
        const senderAdmin = groupMetadata.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))?.admin

        if (!senderAdmin &&!isOwner) return reply('*Admin/Owner only* 💀')

        const members = groupMetadata.participants.map(p => p.id)
        const text = args.join(' ') || '*VOID-MD* 💀'

        await sock.sendMessage(from, {
            text: text,
            mentions: members
        }, { quoted: m })
    }
}
