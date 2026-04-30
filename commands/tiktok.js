const axios = require('axios')

module.exports = {
    name: 'tiktok',
    alias: ['tt', 'tiktokdl'],
    desc: 'Download TikTok video',
    category: 'download',
    async execute({ reply, args, sock, from, m }) {
        if (!args[0]) return reply('*Provide TikTok link* 💀\nExample:.tiktok https://vm.tiktok.com/...')

        reply('*Downloading TikTok...* 🎵')
        try {
            const res = await axios.get(`https://api.dreaded.site/api/tiktok?url=${encodeURIComponent(args[0])}`)
            if (!res.data.success) return reply('*Invalid link* 💀')

            await sock.sendMessage(from, {
                video: { url: res.data.result.video },
                caption: `*${res.data.result.title}*\n*Author:* @${res.data.result.author} 💀`,
                mimetype: 'video/mp4'
            }, { quoted: m })
        } catch (e) {
            reply(`*Error:* ${e.message} 💀`)
        }
    }
}
