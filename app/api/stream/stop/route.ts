import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/stream/stop
 * Body: { resourceId?: string, sid?: string }
 * Header: x-admin-key must match ADMIN_API_KEY env var
 *
 * If Agora Cloud Recording credentials are configured the endpoint will attempt to stop
 * the recording session for the provided resourceId + sid. Otherwise it returns a prepared
 * payload and instructions for an operator to stop the session.
 */

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  const expectedAdmin = process.env.ADMIN_API_KEY;

  // If ADMIN_API_KEY is configured, require it. Otherwise attempt to verify the caller is the room host.
  const body = await req.json().catch(() => ({}));
  const resourceId = body.resourceId;
  const sid = body.sid;
  const channel = body.channel;
  const uid = body.uid;

  if (!resourceId || !sid) {
    return NextResponse.json({ error: 'Missing resourceId or sid in request body' }, { status: 400 });
  }

  if (expectedAdmin) {
    if (!adminKey || adminKey !== expectedAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // If no admin key, require channel+uid so we can verify the caller matches the room host for safety
    if (!channel || !uid) {
      return NextResponse.json({ error: 'Unauthorized: channel and uid required when no ADMIN_API_KEY' }, { status: 401 });
    }

    try {
      const { getFirebaseDb } = await import('@/lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const db = getFirebaseDb();
      const roomsQuery = query(collection(db, 'rooms'), where('agoraChannel', '==', channel), );
      const roomsSnap = await getDocs(roomsQuery);
      if (roomsSnap.empty) {
        console.warn('[Stream Stop] No room found for channel', channel);
        return NextResponse.json({ error: 'Unauthorized: channel not recognized and ADMIN_API_KEY not set' }, { status: 401 });
      }
      const roomDoc = roomsSnap.docs[0];
      const room = roomDoc.data() as any;
      if (!room.hostUid || String(room.hostUid) !== String(uid)) {
        console.warn('[Stream Stop] Caller UID does not match room hostUid', { uid, hostUid: room.hostUid });
        return NextResponse.json({ error: 'Unauthorized: caller is not room host' }, { status: 403 });
      }
    } catch (e) {
      console.warn('[Stream Stop] Firestore host verification failed:', String(e));
      return NextResponse.json({ error: 'Server misconfiguration: cannot verify caller', details: String(e) }, { status: 500 });
    }
  }

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const recordingBase = process.env.AGORA_CLOUD_RECORDING_BASE; // e.g. https://api.agora.io/v1/apps
  const customerId = process.env.AGORA_CLOUD_RECORDING_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CLOUD_RECORDING_CUSTOMER_SECRET;

  if (!(recordingBase && customerId && customerSecret)) {
    return NextResponse.json({
      error: 'Agora Cloud Recording credentials not configured',
      hint: 'Provide AGORA_CLOUD_RECORDING_BASE, AGORA_CLOUD_RECORDING_CUSTOMER_ID and AGORA_CLOUD_RECORDING_CUSTOMER_SECRET to enable automated stop calls',
      stopPayload: { resourceId, sid, appId },
    });
  }

  try {
    const stopUrl = `${recordingBase}/${appId}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`;

    const stopRes = await fetch(stopUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${customerId}:${customerSecret}`).toString('base64'),
      },
      body: JSON.stringify({ clientRequest: {} }),
    });

    if (!stopRes.ok) {
      const text = await stopRes.text();
      return NextResponse.json({ error: 'Stop failed', status: stopRes.status, details: text }, { status: 502 });
    }

    const stopJson = await stopRes.json();
    return NextResponse.json({ ok: true, stop: stopJson });
  } catch (err) {
    return NextResponse.json({ error: 'Exception calling Agora Cloud Recording stop', details: String(err) }, { status: 500 });
  }
}
