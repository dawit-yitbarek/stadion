// Input Validation and Safe Parsing Utilities

export interface ValidatedServer {
  name: string;
  url: string;
  type: 'direct' | 'drm' | 'referer';
  header?: Record<string, string>;
}

// Validates and sanitizes server object
export function validateServer(server: any): ValidatedServer | null {
  if (!server || typeof server !== 'object') {
    console.warn('Invalid server object:', server);
    return null;
  }

  const { name, url, type, header } = server;

  // Validate required fields
  if (!name || typeof name !== 'string') {
    console.warn('Invalid server name:', name);
    return null;
  }

  if (!url || typeof url !== 'string' || !isValidUrl(url)) {
    console.warn('Invalid server URL:', url);
    return null;
  }

  if (!['direct', 'drm', 'referer'].includes(type)) {
    console.warn('Invalid server type:', type);
    return null;
  }

  // Validate header if provided
  let validatedHeader: Record<string, string> | undefined;
  if (header && typeof header === 'object') {
    validatedHeader = {};
    for (const [key, value] of Object.entries(header)) {
      if (typeof value === 'string') {
        validatedHeader[key] = value;
      }
    }
  }

  return {
    name,
    url,
    type,
    header: validatedHeader,
  };
}

// Validates URL format
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

// Safely parses hex string to bytes
export function safeHexToBase64(hexString: string): string | null {
  try {
    if (!hexString || typeof hexString !== 'string') {
      return null;
    }

    // Match hex pairs
    const hexPairs = hexString.match(/.{1,2}/g);
    if (!hexPairs) {
      console.warn('Invalid hex string format:', hexString);
      return null;
    }

    const byteArray = hexPairs.map(val => {
      const byte = parseInt(val, 16);
      if (isNaN(byte)) {
        throw new Error(`Invalid hex pair: ${val}`);
      }
      return byte;
    });

    const binaryString = String.fromCharCode(...byteArray);
    return btoa(binaryString).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  } catch (error) {
    console.error('Failed to parse hex to base64:', error);
    return null;
  }
}

// Validates match data structure
export function validateMatchData(match: any): boolean {
  if (!match || typeof match !== 'object') return false;

  const requiredFields = ['id', 'match_time', 'match_status', 'home_team_name', 'away_team_name', 'league_name', 'servers'];
  return requiredFields.every(field => field in match);
}

// Set match status based on match time
export function setLiveStatus(matchTime: number): ("live" | "vs") {
  const matchTimeMs = matchTime * 1000;
  const currentTimeMs = Date.now();

  // If a match started less than 2.5 hours ago, flag it as live
  const MATCH_WINDOW_MS = 2 * 60 * 60 * 1000;

  if (currentTimeMs >= matchTimeMs && currentTimeMs <= (matchTimeMs + MATCH_WINDOW_MS)) {
    return 'live';
  }
  return 'vs';
}

// Safely extracts and validates DRM parameters
export function parseDrmUrl(url: string): { url: string; licenseKey: string | null } | null {
  try {
    if (!url.includes('|')) {
      return { url, licenseKey: null };
    }

    const [rawUrl, drmParamsString] = url.split('|');
    if (!rawUrl || !drmParamsString) {
      return null;
    }

    const paramsMap: Record<string, string> = {};
    drmParamsString.split('&').forEach(param => {
      const [key, val] = param.split('=');
      if (key && val) {
        paramsMap[key.trim()] = val.trim();
      }
    });

    return {
      url: rawUrl.trim(),
      licenseKey: paramsMap['drmLicense'] || null,
    };
  } catch (error) {
    console.error('Failed to parse DRM URL:', error);
    return null;
  }
}
