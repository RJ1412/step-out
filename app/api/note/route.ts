import { NextRequest, NextResponse } from 'next/server';
import { processAudioNote } from '@/lib/notes';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB limit

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip, 20, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many recordings submitted. Take a moment.' }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('audio') || formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No audio file provided in request' }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Audio file exceeds 25 MB limit' },
        { status: 413 }
      );
    }

    // Convert blob to File with appropriate name if needed
    const audioFile =
      file instanceof File
        ? file
        : new File([file], 'recording.webm', { type: file.type || 'audio/webm' });

    const location = (formData.get('location') as string) || undefined;
    const weather = (formData.get('weather') as string) || undefined;
    const mood = (formData.get('mood') as string) || undefined;

    const entry = await processAudioNote(audioFile, { location, weather, mood });

    return NextResponse.json({ entry });
  } catch (err: any) {
    console.error('Note route error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process voice note' },
      { status: 500 }
    );
  }
}
