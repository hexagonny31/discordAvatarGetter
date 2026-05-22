import { spawn } from 'child_process';
import 'dotenv/config';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const  USER_ID = "561735915450400779";

async function getDiscordAvatar(userId) {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });

    if(!res.ok) throw new Error(`Discord API error ${res.status}`);
    const user = await res.json();

    if (!user.avatar) {
        const index = parseInt(user.discriminator || "0") % 5;
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;    
    }

    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    const size = 512;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
}

getDiscordAvatar(USER_ID)
    .then(url => {
        console.log("Found Avatar URL:", url);
        spawn('cmd.exe', ['/c', 'start', '', url]);
    })
    .catch(err => console.error(err));