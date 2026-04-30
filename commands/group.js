module.exports = {
    name: 'group',
    alias: ['gc'],
    desc: 'Open/close group',
    category: 'admin',
    async execute({ reply, args, sock, from, isGroup, isOwner, m }) {
        if (!isGroup) return reply('*Group only* 💀')

        const groupMetadata = await sock.groupMetadata(from)
        const botAdmin = groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin
        const senderAdmin = groupMetadata.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))?.admin

        if (!botAdmin) return reply('*Bot must be admin* 💀')
        if (!senderAdmin &&!isOwner) return reply('*Admin/Owner only* 💀')

        if (args[0] === 'open') {
            await sock.groupSettingUpdate(from, 'not_announcement')
            reply('*Group opened* 💀\nEveryone can send messages now')
        } else if (args[0] === 'close') {
            await sock.groupSettingUpdate(from, 'announcement')
            reply('*Group closed* 💀\nOnly admins can send messages')
        } else {
            reply(`*Group Settings*\n\nUse:.group open/close`)
        }
    }
}
