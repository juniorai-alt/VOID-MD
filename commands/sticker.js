module.exports = {
    name: 'sticker',
    alias: ['s', 'stiker'],
    desc: 'Convert image/video to sticker',
    category: 'converter',
    async execute({ reply, sock, m, from, quoted }) {
        const q = quoted? quoted : m
        const mime = (q.message?.imageMessage || q.message?.videoMessage)?.mimetype || ''

        if (!/image|video/.test(mime)) return reply('*Reply to image/video* 💀\nOr send image with caption.s')

        reply('*Making sticker...* 💀')
        try {
            const media = await sock.downloadMediaMessage(q)
            await sock.sendMessage(from, {
                sticker: media
            }, { quoted: m })
        } catch (e) {
            reply(`*Error:* ${e.message} 💀`)
        }
    }
}
