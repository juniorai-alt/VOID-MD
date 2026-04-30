module.exports = {
    name: 'unmute',
    desc: 'Unmute group',
    category: 'admin',
    async execute({ reply, sock, from, isGroup, isOwner, m }) {
        if (!isGroup) return reply('*Group only* 💀')

        const groupMetadata = await sock.groupMetadata(from)
        const botAdmin = groupMetadata.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin
        const senderAdmin = groupMetadata.participants.find(p => p.id === (m.key.participant || m.key.remoteJid))?.admin

        if (!botAdmin) return reply('*Bot must be admin* 💀')
        if (!senderAdmin &&!isOwner) return reply('*Admin/Owner only* 💀')

        await sock.groupSettingUpdate(from, 'not_announcement')
        reply('*Group unmuted* 💀\nEveryone can chat now')
    }
          }
