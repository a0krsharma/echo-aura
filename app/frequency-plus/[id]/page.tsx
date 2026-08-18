"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Zap,
  Heart,
  Share2,
  MessageSquare,
  Clock,
  Mic,
  Square,
  Loader2,
  Headphones,
} from "lucide-react";
import { useAuth } from "@/app/components/AuthProvider";
import { ShareButton } from "@/app/components/ShareButton";
import { FormattedText } from "@/app/components/FormattedText";
import {
  getEpisodeById,
  recordEpisodeListen,
  pulseEpisode,
  subscribeToTimestampedVoiceReplies,
  addTimestampedVoiceReply,
  logShareAction,
  type FrequencyPlusEpisode,
  type TimestampedVoiceReply,
} from "@/lib/frequencyPlus";
import { uploadAudio } from "@/lib/cloudinary";

export default function EpisodeStagePage() {
  const params = useParams();
  const episodeId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();

  const [episode, setEpisode] = useState<FrequencyPlusEpisode | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pulsed, setPulsed] = useState(false);

  // Voice replies
  const [voiceReplies, setVoiceReplies] = useState<TimestampedVoiceReply[]>([]);
  const [isRecordingReply, setIsRecordingReply] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingReply, setUploadingReply] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Episode
  useEffect(() => {
    if (!episodeId) return;
    getEpisodeById(episodeId).then((ep) => {
      setEpisode(ep);
      setLoading(false);
      if (ep) {
        setDuration(ep.durationSeconds || 0);
        recordEpisodeListen(episodeId, ep.creatorUid);
      }
    });

    const unsubReplies = subscribeToTimestampedVoiceReplies(episodeId, (list) => {
      setVoiceReplies(list);
    });

    return () => unsubReplies();
  }, [episodeId]);

  // Audio Playback Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn(err));
      setIsPlaying(true);
    }
  };

  const skipTime = (delta: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handlePulse = async () => {
    if (!episode || pulsed) return;
    setPulsed(true);
    await pulseEpisode(episode.id, episode.creatorUid);
  };

  // Timestamped Voice Reply Recording
  const startRecordingTake = async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await handleSaveVoiceReply(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingReply(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 30) {
            stopRecordingTake();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access failed:", err);
    }
  };

  const stopRecordingTake = () => {
    if (mediaRecorderRef.current && isRecordingReply) {
      mediaRecorderRef.current.stop();
      setIsRecordingReply(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleSaveVoiceReply = async (blob: Blob) => {
    if (!episode || !user) return;
    setUploadingReply(true);
    try {
      const result = await uploadAudio(blob, `reply_${episode.id}`);
      await addTimestampedVoiceReply(episode.id, episode.creatorUid, {
        uid: user.uid,
        handle: user.handle || "@ANON",
        audioUrl: result.secureUrl,
        durationSeconds: recordingSeconds,
        timestampSeconds: Math.floor(currentTime),
      });
    } catch (err) {
      console.error("Failed to upload voice reply:", err);
    } finally {
      setUploadingReply(false);
    }
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading || !episode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono text-xs uppercase tracking-widest">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-500 mb-2" />
        <span>[ RETRIEVING TRANSMISSION... ]</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-12 font-mono">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || episode.durationSeconds)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-8 pb-4 border-b border-neutral-900 max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/frequency-plus")}
          className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors cursor-pointer text-xs uppercase tracking-widest"
        >
          <ArrowLeft size={16} />
          <span>FREQUENCY+</span>
        </button>
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
          // PROOF-OF-WORK AUDIO
        </span>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Transmission Overview Card */}
        <div className="border border-white bg-neutral-950 p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-neutral-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Headphones size={13} className="text-white" />
              TRANSMISSION // [{episode.category}]
            </span>
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <Zap size={12} className="fill-yellow-400" />
              +{episode.totalVoltsGenerated} VOLTS MINED
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
            <FormattedText text={episode.title} />
          </h1>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-neutral-900">
            <p>
              CREATOR: <span className="text-white font-bold">{episode.creatorHandle}</span>
            </p>
            <p className="flex items-center gap-1">
              <Clock size={12} />
              {formatSecs(duration)} TOTAL
            </p>
          </div>

          {/* Interactive Player Console */}
          <div className="border border-neutral-800 bg-black p-4 space-y-4">
            {/* Timeline Slider */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-white bg-neutral-800 h-1.5 rounded appearance-none cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                <span>{formatSecs(currentTime)}</span>
                <span>{formatSecs(duration)}</span>
              </div>
            </div>

            {/* Main Deck Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
              <div className="flex items-center gap-2">
                {/* -15s Skip */}
                <button
                  onClick={() => skipTime(-15)}
                  className="p-2 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
                  title="Rewind 15 seconds"
                >
                  <RotateCcw size={14} />
                </button>

                {/* Play / Pause */}
                <button
                  onClick={togglePlay}
                  className="px-5 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
                </button>

                {/* +15s Skip */}
                <button
                  onClick={() => skipTime(15)}
                  className="p-2 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
                  title="Forward 15 seconds"
                >
                  <RotateCw size={14} />
                </button>

                {/* Speed Toggle */}
                <button
                  onClick={cycleSpeed}
                  className="px-2.5 py-1.5 border border-neutral-800 text-neutral-300 hover:border-white text-xs font-bold uppercase cursor-pointer"
                >
                  {playbackRate}X
                </button>
              </div>

              {/* Pulse & Share */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePulse}
                  className={`px-3 py-1.5 border text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                    pulsed
                      ? "border-red-500 bg-red-950/40 text-red-400 font-bold"
                      : "border-neutral-800 text-neutral-400 hover:border-white hover:text-white"
                  }`}
                >
                  <Heart size={13} className={pulsed ? "fill-red-400" : ""} />
                  <span>{episode.metrics.pulses + (pulsed ? 1 : 0)} PULSE</span>
                </button>

                <ShareButton
                  title={episode.title}
                  text={`Listen to "${episode.title}" on Frequency+`}
                  label="SHARE"
                  variant="button"
                  className="px-3 py-1.5 text-xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          {episode.description && (
            <div className="pt-2">
              <p className="text-xs text-neutral-300 font-serif italic whitespace-pre-wrap">
                "{episode.description}"
              </p>
            </div>
          )}
        </div>

        {/* Timestamped Voice Replies Section */}
        <div className="border border-neutral-800 bg-neutral-950 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 text-xs">
            <span className="font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} />
              // ASYNC VOICE TAKES ({voiceReplies.length})
            </span>
            <span className="text-[10px] text-neutral-500 uppercase">
              ANCHORED TO TIMESTAMPS
            </span>
          </div>

          {/* Recorder Trigger */}
          <div className="p-3 border border-neutral-800 bg-black flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-bold text-white uppercase">DROP A VOICE TAKE AT [{formatSecs(currentTime)}]</p>
              <p className="text-[10px] text-neutral-500">Record a 30s audio take anchored at the current playback position.</p>
            </div>

            {isRecordingReply ? (
              <button
                onClick={stopRecordingTake}
                className="px-4 py-2 border border-red-500 bg-red-950 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse cursor-pointer"
              >
                <Square size={13} />
                <span>STOP ({30 - recordingSeconds}s)</span>
              </button>
            ) : (
              <button
                onClick={startRecordingTake}
                disabled={uploadingReply}
                className="px-4 py-2 border border-white bg-white text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                {uploadingReply ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
                <span>{uploadingReply ? "SAVING..." : "[ 🎙 RECORD TAKE ]"}</span>
              </button>
            )}
          </div>

          {/* Voice Replies List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {voiceReplies.length === 0 ? (
              <p className="text-center py-6 text-xs text-neutral-600 uppercase tracking-widest">
                NO ASYNC VOICE TAKES YET. DROP THE FIRST TAKE ABOVE.
              </p>
            ) : (
              voiceReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-3 border border-neutral-900 bg-black flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = reply.timestampSeconds;
                          audioRef.current.play();
                          setIsPlaying(true);
                        }
                      }}
                      className="px-2 py-0.5 border border-neutral-800 bg-neutral-950 text-[10px] text-neutral-400 hover:border-white hover:text-white uppercase font-mono cursor-pointer"
                      title="Jump to timestamp"
                    >
                      @{formatSecs(reply.timestampSeconds)}
                    </button>
                    <span className="font-bold text-white">{reply.handle}</span>
                  </div>

                  <audio src={reply.audioUrl} controls className="h-7 max-w-[180px] sm:max-w-xs" />
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
