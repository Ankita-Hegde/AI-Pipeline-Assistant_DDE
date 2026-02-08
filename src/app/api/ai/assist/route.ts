import { NextRequest, NextResponse } from 'next/server';
import { aiClient, AI_MODEL } from '@/lib/aiClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, pipeline } = body as { prompt: string; pipeline?: any };

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are an AI assistant that helps design data pipelines. Represent pipelines as steps: source, transform, destination. Respond concisely.',
      },
      {
        role: 'user' as const,
        content:
          pipeline
            ? `Current pipeline JSON:\n${JSON.stringify(pipeline, null, 2)}\nUser request: ${prompt}`
            : prompt,
      },
    ];

    const completion = await aiClient.chat.completions.create({
      model: AI_MODEL,
      messages,
    });

    const text = completion.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ text });
  } catch (err: any) {
    console.error('AI assist error', err);
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 });
  }
}
