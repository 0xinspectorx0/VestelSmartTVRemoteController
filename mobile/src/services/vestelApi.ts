import { Platform } from 'react-native';
import * as Network from 'expo-network';
import { TvCheckResult, TvDevice, VESTEL_KEYS } from '../types/tv';

export function isValidIPv4(ip: string): boolean {
  const trimmed = ip.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 4) {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }
    const num = Number(part);
    return String(num) === part && num >= 0 && num <= 255;
  });
}

export function isValidSubnetPrefix(prefix: string): boolean {
  const trimmed = prefix.trim().replace(/\.$/, '');
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }
    const num = Number(part);
    return String(num) === part && num >= 0 && num <= 255;
  });
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 2400,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

function extractXmlTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!match?.[1]) {
    return undefined;
  }
  return match[1]
    .trim()
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

export async function checkTvAccessible(
  ip: string,
  discoveryPort = 56792,
  remotePort = 56791,
  timeoutMs = 2000,
  externalSignal?: AbortSignal
): Promise<TvCheckResult> {
  const cleanIp = ip.trim();
  const candidates: Array<{ discovery: number; remote: number }> = [
    { discovery: discoveryPort, remote: remotePort },
  ];

  if (discoveryPort === 56792 && remotePort === 56791) {
    candidates.push({ discovery: 56790, remote: 56789 });
  }

  for (const candidate of candidates) {
    try {
      const response = await fetchWithTimeout(
        `http://${cleanIp}:${candidate.discovery}/dd.xml`,
        { method: 'GET' },
        timeoutMs,
        externalSignal
      );
      if (response.ok || response.status < 500) {
        let friendlyName: string | undefined;
        let modelName: string | undefined;
        try {
          const xmlText = await response.text();
          friendlyName = extractXmlTag(xmlText, 'friendlyName');
          modelName = extractXmlTag(xmlText, 'modelName');
        } catch {
          // XML okunamasa bile port yanıt verdi
        }
        return {
          accessible: true,
          friendlyName,
          modelName,
          detectedDiscoveryPort: candidate.discovery,
          detectedRemotePort: candidate.remote,
        };
      }
    } catch {
      // Sonraki port adayını dene
    }
  }

  return { accessible: false };
}

export function buildRemoteXml(keyCode: number): string {
  return `<?xml version="1.0" ?> <remote> <key code="${keyCode}"/> </remote>`;
}

export async function sendKeyCode(
  device: TvDevice | null,
  keyCode: number,
  demoMode = false
): Promise<{ ok: boolean; demo: boolean }> {
  if (demoMode || !device) {
    await sleep(45);
    return { ok: Boolean(demoMode), demo: true };
  }

  const xml = buildRemoteXml(keyCode);
  const url = `http://${device.ip}:${device.remotePort}/apps/vr/remote`;

  try {
    await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: xml,
      },
      2400
    );
    return { ok: true, demo: false };
  } catch {
    return { ok: false, demo: false };
  }
}

export async function launchApplication(
  device: TvDevice | null,
  appName: string,
  demoMode = false
): Promise<{ ok: boolean; demo: boolean }> {
  if (demoMode || !device) {
    await sleep(60);
    return { ok: Boolean(demoMode), demo: true };
  }

  const url = `http://${device.ip}:${device.remotePort}/apps/${encodeURIComponent(appName)}`;

  try {
    await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
      2800
    );
    return { ok: true, demo: false };
  } catch {
    return { ok: false, demo: false };
  }
}

const DIGIT_KEY_MAP: Record<string, number> = {
  '0': VESTEL_KEYS.NUM_0,
  '1': VESTEL_KEYS.NUM_1,
  '2': VESTEL_KEYS.NUM_2,
  '3': VESTEL_KEYS.NUM_3,
  '4': VESTEL_KEYS.NUM_4,
  '5': VESTEL_KEYS.NUM_5,
  '6': VESTEL_KEYS.NUM_6,
  '7': VESTEL_KEYS.NUM_7,
  '8': VESTEL_KEYS.NUM_8,
  '9': VESTEL_KEYS.NUM_9,
};

export async function goToChannelSequence(
  device: TvDevice | null,
  channelInput: string,
  demoMode = false,
  onDigitSent?: (digit: string, index: number, total: number) => void
): Promise<{ ok: boolean; demo: boolean }> {
  const cleaned = channelInput.trim();
  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, demo: demoMode };
  }

  const digits = cleaned.split('');
  for (let i = 0; i < digits.length; i += 1) {
    const digit = digits[i];
    const code = DIGIT_KEY_MAP[digit] ?? VESTEL_KEYS.NUM_0;
    onDigitSent?.(digit, i + 1, digits.length);
    const res = await sendKeyCode(device, code, demoMode);
    if (!res.ok) {
      return res;
    }
    await sleep(200);
  }

  return sendKeyCode(device, VESTEL_KEYS.OK, demoMode);
}

export async function changeVolumeBatch(
  device: TvDevice | null,
  steps: number,
  direction: 'up' | 'down',
  demoMode = false,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<{ ok: boolean; demo: boolean; completedSteps: number }> {
  const keyCode = direction === 'up' ? VESTEL_KEYS.VOL_UP : VESTEL_KEYS.VOL_DOWN;
  const clampedSteps = Math.max(1, Math.min(50, Math.floor(steps)));

  for (let i = 1; i <= clampedSteps; i += 1) {
    if (signal?.aborted) {
      return { ok: true, demo: demoMode, completedSteps: i - 1 };
    }
    onProgress?.(i, clampedSteps);
    const res = await sendKeyCode(device, keyCode, demoMode);
    if (!res.ok) {
      return { ok: false, demo: res.demo, completedSteps: i - 1 };
    }
    if (i < clampedSteps) {
      await sleep(280);
    }
  }

  return { ok: true, demo: demoMode, completedSteps: clampedSteps };
}

export async function detectLocalSubnetPrefix(): Promise<string> {
  if (Platform.OS === 'web') {
    return '192.168.1';
  }
  try {
    const ip = await Network.getIpAddressAsync();
    if (ip && isValidIPv4(ip) && !ip.startsWith('127.')) {
      const octets = ip.split('.');
      return `${octets[0]}.${octets[1]}.${octets[2]}`;
    }
  } catch {
    // Varsayılan ev ağı alt ağına düş
  }
  return '192.168.1';
}

export async function scanSubnetForVestelTvs(
  subnetPrefix: string,
  onProgress?: (progressPercent: number) => void,
  onFound?: (device: TvDevice) => void,
  signal?: AbortSignal
): Promise<TvDevice[]> {
  const cleanPrefix = subnetPrefix.trim().replace(/\.$/, '');
  if (!isValidSubnetPrefix(cleanPrefix)) {
    return [];
  }

  const found: TvDevice[] = [];
  const hosts = Array.from({ length: 254 }, (_, idx) => `${cleanPrefix}.${idx + 1}`);
  const batchSize = 26;

  for (let offset = 0; offset < hosts.length; offset += batchSize) {
    if (signal?.aborted) {
      break;
    }

    const batch = hosts.slice(offset, offset + batchSize);
    await Promise.all(
      batch.map(async (hostIp) => {
        if (signal?.aborted) {
          return;
        }
        const check = await checkTvAccessible(hostIp, 56792, 56791, 680, signal);
        if (check.accessible) {
          const discovered: TvDevice = {
            id: `tv-${hostIp.replace(/\./g, '-')}`,
            name: check.friendlyName || check.modelName || `Vestel TV (${hostIp})`,
            ip: hostIp,
            remotePort: check.detectedRemotePort ?? 56791,
            discoveryPort: check.detectedDiscoveryPort ?? 56792,
            modelName: check.modelName,
            lastConnectedAt: Date.now(),
          };
          found.push(discovered);
          onFound?.(discovered);
        }
      })
    );

    const pct = Math.min(100, Math.round(((offset + batch.length) / hosts.length) * 100));
    onProgress?.(pct);
  }

  return found;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
