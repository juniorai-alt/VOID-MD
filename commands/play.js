const axios = require('axios')

module.exports = {
    name: 'play',
    alias: ['song', 'ytmp3', 'music'],
    desc: 'Download YouTube audio',
    category: 'download',
    async execute({ reply, args, sock, from, m }) {
        if (!args[0]) return reply('*Provide YouTube link or song name* 💀\nExample:.play https://youtu.be/...')

        const query = args.join(' ')
        reply('*Downloading audio...* 🎵')

        try {
            // Using free API - replace with your own if needed
            const res = await axios.get(`https://api.dreaded.site/api/ytdl/audio?url=${encodeURIComponent(query)}`)
            if (!res.data.success) return reply('*Failed to fetch* 💀')

            await sock.sendMessage(from, {
                audio: { url: res.data.result.download },
                mimetype: 'audio/mpeg',
                fileName: `${res.data.result.title}.mp3`
            }, { quoted: m })
        } catch (e) {
            reply(`*Error:* ${e.message} 💀`)
        }
    }
}
