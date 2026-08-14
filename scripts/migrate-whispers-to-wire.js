#!/usr/bin/env node
/**
 * migrate-whispers-to-wire.js
 * Copy documents from 'whispers' collection to 'wire' collection as part of migration.
 *
 * Usage:
 *   SERVICE_ACCOUNT=/path/to/serviceAccount.json node scripts/migrate-whispers-to-wire.js
 *
 * WARNING: This script performs writes to your Firestore project. Test in staging first.
 */

const admin = require('firebase-admin');
const fs = require('fs');

const svcPath = process.env.SERVICE_ACCOUNT;
if (!svcPath) {
  console.error('Missing SERVICE_ACCOUNT environment variable pointing to service account JSON.');
  process.exit(2);
}

if (!fs.existsSync(svcPath)) {
  console.error('Service account file not found:', svcPath);
  process.exit(2);
}

admin.initializeApp({ credential: admin.credential.cert(require(svcPath)) });
const db = admin.firestore();

async function migrate() {
  console.log('Starting migration: whispers -> wire');
  const batchSize = 200;
  let total = 0;

  try {
    const snapshot = await db.collection('whispers').get();
    console.log('Found', snapshot.size, 'conversations to migrate');

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);

      for (const docSnap of chunk) {
        const data = docSnap.data();
        const targetRef = db.collection('wire').doc(docSnap.id);
        batch.set(targetRef, data, { merge: false });

        // Copy subcollections (messages, signaling) - naive approach
        const messagesSnap = await docSnap.ref.collection('messages').get();
        for (const m of messagesSnap.docs) {
          const targetMsgRef = targetRef.collection('messages').doc(m.id);
          batch.set(targetMsgRef, m.data(), { merge: false });
        }

        const sigSnap = await docSnap.ref.collection('signaling').get();
        for (const s of sigSnap.docs) {
          const targetSigRef = targetRef.collection('signaling').doc(s.id);
          batch.set(targetSigRef, s.data(), { merge: false });
        }

        total++;
      }

      await batch.commit();
      console.log('Committed batch up to', i + chunk.length);
    }

    console.log('Migration complete. Migrated', total, 'conversations');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrate();
