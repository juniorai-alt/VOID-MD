const axios = require('axios')

module.exports = {
    name: 'video',
    alias: ['ytmp4', 'ytv'],
    desc: 'Download YouTube video',
    category: 'download',
    async execute({ reply, args, sock, from, m }) {
        if (!args[0]) return reply('*Provide YouTube link* 💀\nExample:.video https://youtu.be/...')

        reply('*Downloading video...* 🎬')
        try {
            const res = await axios.get(`https://api.dreaded.site/api/ytdl/video?url=${encodeURIComponent(args[0])}`)
            if (!res.data.success) return reply('*Failed to fetch* 💀')

            await sock.sendMessage(from, {
                video: { url: res.data.result.download },
                caption: `*${res.data.result.title}* 💀`,
                mimetype: 'video/mp4'
            }, { quoted: m })
        } catch (e) {
            reply(`*Error:* ${e.message} 💀`)
        }
    }
}
