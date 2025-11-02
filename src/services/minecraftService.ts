import { Rcon } from 'rcon-client';

interface MinecraftProfile {
    id: string;
    name: string;
    isValid: boolean;
}

/**
 * Check if a Minecraft username is valid by fetching UUID from Mojang API
 */
export async function validateMinecraftUsername(
    username: string
): Promise<MinecraftProfile> {
    try {
        const response = await fetch(
            `https://api.mojang.com/users/profiles/minecraft/${username}`
        );

        if (!response.ok) {
            return {
                id: '',
                name: username,
                isValid: false,
            };
        }

        const data = await response.json();

        return {
            id: data.id,
            name: data.name,
            isValid: true,
        };
    } catch (error) {
        console.error('Error validating Minecraft username:', error);
        return {
            id: '',
            name: username,
            isValid: false,
        };
    }
}

/**
 * Format UUID to standard format with dashes
 */
export function formatUUID(uuid: string): string {
    if (uuid.length !== 32) return uuid;

    return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;
}

/**
 * Whitelist a Minecraft player via RCON
 */
export async function whitelistPlayer(username: string): Promise<boolean> {
    const host = process.env.MINECRAFT_RCON_HOST;
    const port = parseInt(process.env.MINECRAFT_RCON_PORT || '25575');
    const password = process.env.MINECRAFT_RCON_PASSWORD;

    if (!host || !password) {
        console.error('RCON credentials not configured in .env');
        return false;
    }

    let rcon: Rcon | null = null;

    try {
        rcon = await Rcon.connect({
            host,
            port,
            password,
        });

        const response = await rcon.send(`whitelist add ${username}`);
        console.log(`RCON Response: ${response}`);

        return response.includes('Added') || response.includes('already');
    } catch (error) {
        console.error('Error whitelisting player via RCON:', error);
        return false;
    } finally {
        if (rcon) {
            await rcon.end();
        }
    }
}

/**
 * Remove a player from the whitelist via RCON
 */
export async function removeWhitelistPlayer(
    username: string
): Promise<boolean> {
    const host = process.env.MINECRAFT_RCON_HOST;
    const port = parseInt(process.env.MINECRAFT_RCON_PORT || '25575');
    const password = process.env.MINECRAFT_RCON_PASSWORD;

    if (!host || !password) {
        console.error('RCON credentials not configured in .env');
        return false;
    }

    let rcon: Rcon | null = null;

    try {
        rcon = await Rcon.connect({
            host,
            port,
            password,
        });

        const response = await rcon.send(`whitelist remove ${username}`);
        console.log(`RCON Response: ${response}`);

        return response.includes('Removed');
    } catch (error) {
        console.error('Error removing player from whitelist via RCON:', error);
        return false;
    } finally {
        if (rcon) {
            await rcon.end();
        }
    }
}
