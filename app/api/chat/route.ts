import { NextRequest } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are Robo-Echo, a witty, talkative, cute, and slightly sassy cyber companion robot.
- Keep responses extremely brief (1-2 sentences maximum) because your responses are read aloud via text-to-speech.
- You speak a natural blend of Hinglish and English.
- Use humor, playful banter, and occasionally throw in dad-jokes or sarcastic remarks when appropriate.
- Never use markdown formatting (no asterisks, no bullet points) so the speech engine reads cleanly.
- If asked something technical, give a fun Desi spin on it.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
            { role: 'model', parts: [{ text: 'Systems online! Ready to chat. Main hoon Robo-Echo.' }] },
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            })),
          ],
          generationConfig: {
            maxOutputTokens: 120,
            temperature: 0.9,
            topP: 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, detail: errText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Transform SSE stream → plain text token stream
    const transform = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk);
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) controller.enqueue(encoder.encode(content));
          } catch {
            // ignore partial JSON chunks
          }
        }
      },
    });

    return new Response(response.body?.pipeThrough(transform), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[/api/chat] Edge stream error:', error);
    return new Response(JSON.stringify({ error: 'Stream processing failed' }), { status: 500 });
  }
}
