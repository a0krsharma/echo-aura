import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/stream/start
 * Body: { channel: string, uid?: string }
 * Header: x-admin-key must match ADMIN_API_KEY env var (simple protection)
 *
 * If AGORA_CLOUD_RECORDING_BASE + AGORA_CLOUD_RECORDING_CUSTOMER_ID + AGORA_CLOUD_RECORDING_CUSTOMER_SECRET are set,
 * the endpoint will attempt to call Agora's acquire + start cloud recording APIs and
 * return the recording session info. Otherwise it returns a prepared payload and
 * instructions so an operator can perform the action from a secure environment.
 */

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  const expectedAdmin = process.env.ADMIN_API_KEY;

  // If ADMIN_API_KEY is configured, require it. Otherwise attempt to verify the caller is the room host (dev-friendly but safer)
  const body = await req.json().catch(() => ({}));
  const channel = body.channel;
  const uid = body.uid ?? '0';

  if (!channel) {
    return NextResponse.json({ error: 'Missing channel in request body' }, { status: 400 });
  }

  if (expectedAdmin) {
    if (!adminKey || adminKey !== expectedAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // Try to verify the caller is the host for the room that maps to this agora channel.
    // This requires Firestore to be available. If verification fails, reject the request to avoid abuse.
    try {
      const { getFirebaseDb } = await import('@/lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const db = getFirebaseDb();
      const roomsQuery = query(collection(db, 'rooms'), where('agoraChannel', '==', channel), );
      const roomsSnap = await getDocs(roomsQuery);
      if (roomsSnap.empty) {
        console.warn('[Stream Start] No room found for channel', channel);
        return NextResponse.json({ error: 'Unauthorized: channel not recognized and ADMIN_API_KEY not set' }, { status: 401 });
      }
      const roomDoc = roomsSnap.docs[0];
      const room = roomDoc.data() as any;
      if (!room.hostUid || String(room.hostUid) !== String(uid)) {
        console.warn('[Stream Start] Caller UID does not match room hostUid', { uid, hostUid: room.hostUid });
        return NextResponse.json({ error: 'Unauthorized: caller is not room host' }, { status: 403 });
      }
      // OK: caller matches room host
    } catch (e) {
      console.warn('[Stream Start] Firestore host verification failed:', String(e));
      return NextResponse.json({ error: 'Server misconfiguration: cannot verify caller', details: String(e) }, { status: 500 });
    }
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const cdnIngest = process.env.CDN_RTMP_INGEST_URL; // e.g. rtmp://live.cloudflare.com:1935/live
  const cdnKey = process.env.CDN_STREAM_KEY; // your stream key

  if (!appId) {
    return NextResponse.json({ error: 'AGORA App ID not configured (NEXT_PUBLIC_AGORA_APP_ID)' }, { status: 500 });
  }

  const rtmpUrl = cdnIngest && cdnKey ? `${cdnIngest}/${cdnKey}` : null;

  // If Agora Cloud Recording credentials present, try to call the REST API
  const recordingBase = process.env.AGORA_CLOUD_RECORDING_BASE; // e.g. https://api.agora.io/v1/apps
  const customerId = process.env.AGORA_CLOUD_RECORDING_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CLOUD_RECORDING_CUSTOMER_SECRET;

  const prepared = {
    channel,
    uid,
    appId,
    rtmpUrl,
    hints: [] as string[],
  } as any;

  if (!rtmpUrl) prepared.hints.push('CDN_RTMP_INGEST_URL or CDN_STREAM_KEY not set; set env vars to target your CDN.');

  if (!(recordingBase && customerId && customerSecret)) {
    prepared.hints.push('Agora Cloud Recording credentials not provided. The response includes a prepared start payload you can use with Agora Cloud Recording from a secure environment.');
    prepared.startPayload = buildStartPayload(channel, uid, rtmpUrl, appId);

    return NextResponse.json(prepared);
  }

  // Proceed with acquire + start
  try {
    // Acquire resource
    const acquireUrl = `${recordingBase}/${appId}/cloud_recording/acquire`;
    const acquireRes = await fetch(acquireUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${customerId}:${customerSecret}`).toString('base64'),
      },
      body: JSON.stringify({ cname: channel, uid: uid, clientRequest: {} }),
    });

    if (!acquireRes.ok) {
      const text = await acquireRes.text();
      return NextResponse.json({ error: 'Acquire failed', status: acquireRes.status, details: text }, { status: 502 });
    }

    const acquireJson = await acquireRes.json();
    const resourceId = acquireJson.resourceId;

    // Start recording with rtmp stream target
    const startUrl = `${recordingBase}/${appId}/cloud_recording/resourceid/${resourceId}/mode/mix/start`;
    const startPayload = buildStartPayload(channel, uid, rtmpUrl, appId);

    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${customerId}:${customerSecret}`).toString('base64'),
      },
      body: JSON.stringify(startPayload),
    });

    if (!startRes.ok) {
      const text = await startRes.text();
      return NextResponse.json({ error: 'Start failed', status: startRes.status, details: text }, { status: 502 });
    }

    const startJson = await startRes.json();

    return NextResponse.json({ ok: true, acquire: acquireJson, start: startJson });
  } catch (err) {
    return NextResponse.json({ error: 'Exception calling Agora Cloud Recording', details: String(err) }, { status: 500 });
  }
}

function buildStartPayload(channel: string, uid: string, rtmpUrl: string | null, appId: string | undefined) {
  const clientRequest: any = {
    recordingConfig: {
      maxIdleTime: 30,
      streamTypes: 2,
      channelType: 0,
      audioProfile: 1,
      videoStreamType: 0,
      transcodingConfig: {
        // minimal audio-only transcoding
        width: 1280,
        height: 720,
        bitrate: 800,
        fps: 15,
        mixedVideoLayoutConfig: '',
      },
    },
    recordingFileConfig: { avFileType: ['mp4'] },
    // RTMP streaming target
    storageConfig: {},
  };

  if (rtmpUrl) {
    clientRequest.clientRequest = {
      rtmpPublish: {
        rtmpUrl,
      },
    };
  }

  // For Agora cloud recording, the official start payload structure puts the rtmp target under 'recordingConfig' or 'streams' depending on SDK; keep a helpful payload for operators
  return {
    cname: channel,
    uid,
    clientRequest: clientRequest,
  };
}
