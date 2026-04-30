const axios = require('axios')

module.exports = {
    name: 'igdl',
    alias: ['instagram', 'ig'],
    desc: 'Download Instagram post/reel',
    category: 'download',
    async execute({ reply, args, sock, from, m }) {
        if (!args[0]) return reply('*Provide Instagram link* 💀\nExample:.igdl https://instagram.com/...')

        reply('*Downloading...* 📸')
        try {
            const res = await axios.get(`https://api.dreaded.site/api/igdl?url=${encodeURIComponent(args[0])}`)
            if (!res.data.success) return reply('*Failed to fetch* 💀')

            for (const url of res.data.result) {
                if (url.includes('.mp4')) {
                    await sock.sendMessage(from, { video: { url }, caption: '*Instagram Video* 💀' }, { quoted: m })
                } else {
                    await sock.sendMessage(from, { image: { url }, caption: '*Instagram Post* 💀' }, { quoted: m })
                }
            }
        } catch (e) {
            reply(`*Error:* ${e.message} 💀`)
        }
    }
}
