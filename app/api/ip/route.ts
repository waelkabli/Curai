import { NextResponse } from 'next/server';

// Force dynamic so this runs at request time, not build time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try multiple IP services
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://api.my-ip.io/ip.json',
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          const ip = data.ip || data.IP || 'Unknown';
          return NextResponse.json({ ip });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ ip: 'Unable to detect' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get IP';
    return NextResponse.json({ ip: 'Unknown', error: message });
  }
}
