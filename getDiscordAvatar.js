import { spawn } from 'child_process';
import 'dotenv/config'; // You remove this if you set the values directly here.
import https from 'https';

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const USER_ID = process.env.DISCORD_USER_ID || prompt("Enter your Discord User ID: ");
const sizes = [4096, 2048, 1024, 512, 256, 128, 64];

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    rejectUnauthorized: true
});

async function fetchWithRetry(url, options, retries = 3) {
    for(let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { ...options, agent: httpsAgent });
            return res;
        } catch(err) {
            if (i === retries - 1) throw err;
            console.log(`Attempt ${i + 1} failed, retrying...`);
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

async function getDiscordUser(userId) {
    const res = await fetchWithRetry(`https://discord.com/api/v10/users/${userId}`, {
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
    });

    if(!res.ok) throw new Error(`Discord API error ${res.status}`);
    return await res.json();
}

async function getFileSize(url) {
    try {
        const res = await fetchWithRetry(url, { method: 'HEAD' });
        if(!res.ok) return null;
        const size = res.headers.get('content-length');
        return size ? parseInt(size, 10) : null;
    } catch(err) {
        return null;
    }
}

async function getOptimalAvatarUrl(baseUrl, maxSizeMB = 10) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    console.log(`Finding best size (max ${maxSizeMB}MB)...`);
    for(const size of sizes) {
        const url = baseUrl.includes('?size=') 
            ? baseUrl.replace(/\?size=\d+/, `?size=${size}`)
            : `${baseUrl}?size=${size}`;

        const fileSize = await getFileSize(url);
        
        const mb = fileSize ? (fileSize / 1024 / 1024).toFixed(2) : '??';
        console.log(`Tested ${size}px -> ${mb} MB`);

        if(fileSize && fileSize <= maxBytes) {
            console.log(`Optimal size found: ${size}px (${mb} MB)`);
            return { url, size, fileSize };
        }
    }

    const fallbackUrl = baseUrl.includes('?size=') 
        ? baseUrl.replace(/\?size=\d+/, '?size=128')
        : `${baseUrl}?size=128`;
    
    console.log("Using fallback smallest size");
    return { url: fallbackUrl, size: 128, fileSize: null };
}

getDiscordUser(USER_ID)
    .then(async user => {
        console.log(`\nUser: ${user.global_name || user.username} (${user.id})`);
        
        let avatarUrl = null;
        if(!user.avatar) {
            const index = parseInt(user.discriminator || "0") % 5;
            avatarUrl   = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
        } else {
            const ext = user.avatar.startsWith("a_") ? "gif" : "png";
            avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}`;
        }

        let bannerUrl = null;
        if(user.banner) {
            const ext = user.banner.startsWith("a_") ? "gif" : "png";
            bannerUrl = `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=${sizes[2]}`;
            console.log("User has a banner...");
        }

        // This is where we find the best avatar size under the specified max file size
        const optimal = await getOptimalAvatarUrl(avatarUrl, 10);

        console.log("\nAvatar URL:", optimal.url);
        if(optimal.fileSize) {
            const mb = (optimal.fileSize / 1024 / 1024).toFixed(2);
            console.log(`File Size: ${optimal.fileSize} bytes (${mb} MB)`);
        }

        console.log("Banner URL:", bannerUrl || "No banner");
        if(bannerUrl) {
            const bannerSize = await getFileSize(bannerUrl);
            if(bannerSize) {
                const mb = (bannerSize / 1024 / 1024).toFixed(2);
                console.log(`File Size: ${bannerSize} bytes (${mb} MB)`);
            }
        }

        spawn('cmd.exe', ['/c', 'start', '', optimal.url]);
        if(bannerUrl) spawn('cmd.exe', ['/c', 'start', '', bannerUrl]);
    })
    .catch(err => console.error(err));