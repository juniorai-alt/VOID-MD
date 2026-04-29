module.exports = {
    name: 'owner',
    desc: 'Owner contact info',
    execute: async ({ sock, m, from, OWNER_NAME, OWNER_NUMBER, reply }) => {
        await sock.sendMessage(from, { react: { text: '👑', key: m.key } })
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${OWNER_NAME}\nTEL;type=CELL;type=VOICE;waid=${OWNER_NUMBER}:+${OWNER_NUMBER}\nEND:VCARD`
        await sock.sendMessage(from, { contacts: { displayName: OWNER_NAME, contacts: [{ vcard }] } })
        await reply(`👑 *Owner:* ${OWNER_NAME}\n📞 *Number:* +${OWNER_NUMBER}`)
    }
}
