import axios from 'axios';

interface StreamServer {
    name: string;
    url: string;
    type: 'direct' | 'drm' | 'referer';
    header?: Record<string, string>;
}

export async function verifyStreamChannel(serverList: StreamServer[]): Promise<StreamServer[]> {

    // Safety check: ensure serverList is a valid array and has content
    if (!Array.isArray(serverList) || serverList.length === 0) {
        return [];
    }

    const checkPromises = serverList.map(async (server) => {
        try {
            if (server.type === "drm") {
                return null; // Skip DRM servers
            }
            const cleanUrl = server?.url?.split('|')[0]?.trim();

            // HEAD request to check server status code
            await axios({
                method: 'HEAD',
                url: cleanUrl ?? '',
                headers: {
                    // Fallback to a common user-agent if none is provided
                    'User-Agent': server.header?.['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ...server.header
                },
                timeout: 5000 // If the server takes > 5 seconds to respond, drop it
            });

            // If no error was thrown, the server responded with a healthy 200 OK status
            return server;
        } catch (error: any) {
            return null;
        }
    });

    // all checks simultaneously in parallel
    const results = await Promise.all(checkPromises);

    return results.filter((server) => server !== null);
}