'use client';

import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry } from '@/lib/notes';
import {
  loadJournalEntries,
  saveJournalEntry,
  deleteJournalEntry,
  exportJournalToMarkdown,
} from '@/lib/storage';

interface VoiceNotesProps {
  locationContext?: string;
  weatherContext?: string;
  moodContext?: string;
}

export function VoiceNotes({ locationContext, weatherContext, moodContext }: VoiceNotesProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted entries on mount
  useEffect(() => {
    setEntries(loadJournalEntries());
  }, []);

  // Clean up media recorder stream on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Audio recording is not supported in this browser. You can type below instead.');
      setShowManualInput(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all audio tracks to release microphone hardware indicator
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioUpload(audioBlob);
      };

      recorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setElapsedSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone permission was not granted. Type a field note directly below.');
      } else {
        setMicError(`Could not access microphone: ${err.message || 'unknown error'}`);
      }
      setShowManualInput(true);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleAudioUpload = async (blob: Blob) => {
    if (blob.size === 0) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'trail-note.webm');
      if (locationContext) formData.append('location', locationContext);
      if (weatherContext) formData.append('weather', weatherContext);
      if (moodContext) formData.append('mood', moodContext);

      const res = await fetch('/api/note', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process note');
      }

      if (data.entry) {
        const updated = saveJournalEntry(data.entry);
        setEntries(updated);
      }
    } catch (err: any) {
      setMicError(err.message || 'Error processing audio note');
    } finally {
      setIsProcessing(false);
      setElapsedSeconds(0);
    }
  };

  // Fallback direct text note handler
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    setIsProcessing(true);
    setMicError(null);

    try {
      // Create lightweight synthetic audio/text or direct entry
      const nowIso = new Date().toISOString();
      const text = manualText.trim();

      // Extract species and conditions simply
      const entry: JournalEntry = {
        id: `note-${Date.now()}`,
        recorded_at: nowIso,
        raw_transcript: text,
        tidied_note: text,
        tags: {
          species: [],
          place: locationContext ? [locationContext] : [],
          weather: weatherContext ? [weatherContext] : [],
          mood: moodContext ? [moodContext] : ['walk'],
        },
      };

      const updated = saveJournalEntry(entry);
      setEntries(updated);
      setManualText('');
      setShowManualInput(false);
    } catch (err: any) {
      setMicError(err.message || 'Failed saving text note');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    const updated = deleteJournalEntry(id);
    setEntries(updated);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Top note header */}
      <div className="border-b border-[#ded9cc] pb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-xl text-[#1c1b18] font-heading">Voice Trail Notes</h3>
          <p className="text-xs text-[#656259] mt-0.5">
            Spoken observations while walking. Tidied into dated field journal entries.
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => exportJournalToMarkdown(entries)}
            className="text-xs font-mono text-[#274c3d] hover:text-[#173024] underline underline-offset-2 shrink-0 ml-2"
          >
            Export .md
          </button>
        )}
      </div>

      {/* Mic error notice */}
      {micError && (
        <div className="p-3 bg-[#faede6] border border-[#e2b7a3] text-xs text-[#8c3218] rounded-xs leading-relaxed">
          {micError}
        </div>
      )}

      {/* Big Record Button */}
      <div className="bg-[#fdfcf9] border border-[#ded9cc] p-6 text-center rounded-sm">
        <div className="flex flex-col items-center justify-center space-y-3">
          {isRecording ? (
            <button
              type="button"
              id="btn-stop-recording"
              onClick={stopRecording}
              className="w-24 h-24 rounded-full bg-[#c05c31] text-white flex flex-col items-center justify-center shadow-sm hover:bg-[#a64e28] transition-all animate-pulse"
              title="Tap to stop and tidy note"
            >
              <div className="w-6 h-6 bg-white rounded-xs mb-1" />
              <span className="font-mono text-xs font-bold">{formatTimer(elapsedSeconds)}</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-start-recording"
              disabled={isProcessing}
              onClick={startRecording}
              className="w-24 h-24 rounded-full bg-[#274c3d] hover:bg-[#1f3d31] text-[#f7f4ed] flex flex-col items-center justify-center shadow-xs transition-all disabled:opacity-50"
              title="Record voice note"
            >
              <svg className="w-7 h-7 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-xs font-medium tracking-wide">Talk to it</span>
            </button>
          )}

          <div className="text-xs text-[#656259]">
            {isRecording ? (
              <span className="text-[#c05c31] font-medium">Recording trail note • Tap square when done</span>
            ) : isProcessing ? (
              <span className="font-mono text-[#274c3d]">Whisper transcription + llama-3.1-8b cleanup...</span>
            ) : (
              <span>Say what you see: birds, light, landmarks, trail state</span>
            )}
          </div>

          {!isRecording && !isProcessing && (
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-[11px] text-[#787469] hover:text-[#1c1b18] underline underline-offset-2 pt-1 font-mono"
            >
              {showManualInput ? 'Hide text note' : 'Or type a field note'}
            </button>
          )}
        </div>

        {/* Manual text backup form */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="mt-4 pt-4 border-t border-[#ded9cc] text-left">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="e.g. saw a purple-rumped sunbird near the tank, 6:40pm"
              rows={2}
              className="w-full p-2.5 bg-white border border-[#ded9cc] text-xs text-[#1c1b18] placeholder-[#999488] focus:outline-none focus:border-[#274c3d] rounded-xs"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="submit"
                disabled={!manualText.trim() || isProcessing}
                className="px-3 py-1.5 bg-[#274c3d] text-white text-xs rounded-xs hover:bg-[#1d382d] disabled:opacity-50"
              >
                Save entry
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Journal Entries List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-[#656259] font-mono">
          <span>Journal Log ({entries.length})</span>
          <span>Stored in browser</span>
        </div>

        {entries.length === 0 ? (
          <div className="p-4 bg-[#fdfcf9] border border-dashed border-[#ded9cc] text-center text-xs text-[#807b70]">
            No trail notes recorded yet. Tap the button during your outing.
          </div>
        ) : (
          entries.map((entry) => {
            const dateStr = new Date(entry.recorded_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={entry.id}
                className="p-4 bg-[#fdfcf9] border border-[#ded9cc] rounded-xs space-y-2.5 text-left text-sm"
              >
                <div className="flex items-baseline justify-between text-xs text-[#656259]">
                  <span className="font-mono text-[11px]">{dateStr}</span>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-[#9e4125] hover:text-[#7d3019] text-[11px] font-mono"
                    title="Delete note"
                  >
                    remove
                  </button>
                </div>

                <p className="text-[#1c1b18] leading-relaxed italic font-serif text-base">
                  &ldquo;{entry.tidied_note}&rdquo;
                </p>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {entry.tags.species?.map((sp, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#e4ece7] text-[#274c3d] rounded-xs border border-[#cbd8d0]"
                    >
                      {sp}
                    </span>
                  ))}
                  {entry.tags.place?.map((pl, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#f5ede3] text-[#824d27] rounded-xs border border-[#e5d6c5]"
                    >
                      {pl}
                    </span>
                  ))}
                  {entry.tags.weather?.map((w, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#edf1f2] text-[#425a66] rounded-xs border border-[#cfdbe0]"
                    >
                      {w}
                    </span>
                  ))}
                  {entry.tags.mood?.map((m, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] uppercase font-mono px-2 py-0.5 bg-[#f4f2ea] text-[#696452] rounded-xs border border-[#dedad0]"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                {/* Spoken transcript disclosure */}
                {entry.raw_transcript && entry.raw_transcript !== entry.tidied_note && (
                  <details className="pt-1 text-[11px] text-[#736f64]">
                    <summary className="cursor-pointer hover:text-[#1c1b18]">
                      Show raw spoken audio
                    </summary>
                    <p className="mt-1 pl-2 border-l border-[#ded9cc] font-mono text-[11px] text-[#545046]">
                      {entry.raw_transcript}
                    </p>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
