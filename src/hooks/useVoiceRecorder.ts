// src/hooks/useVoiceRecorder.ts
import { useState, useRef } from "react";

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);

        // Cleanup stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Tidak dapat mengakses mikrofon");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl("");
    setRecordingTime(0);
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data:audio/webm;base64, prefix
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Transcribe audio menggunakan Web Speech API (bisa diganti dengan API external)
  const transcribeAudio = async (blob: Blob): Promise<string> => {
    try {
      // Untuk production, gunakan API seperti:
      // - Google Speech-to-Text
      // - OpenAI Whisper
      // - Atau backend Anda sendiri

      // Contoh sederhana dengan Web Speech API (hanya support Chrome)
      if ("webkitSpeechRecognition" in window) {
        return new Promise((resolve) => {
          const recognition = new (window as any).webkitSpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = "id-ID"; // Bahasa Indonesia

          // Convert blob to audio URL untuk recognition
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);

          // Web Speech API hanya bisa dari microphone langsung
          // Untuk file audio, butuh backend service
          resolve("[Transkripsi suara]"); // Placeholder
        });
      }

      return "[Pesan suara]"; // Fallback text
    } catch (error) {
      console.error("Transcription error:", error);
      return "[Pesan suara]";
    }
  };

  // Prepare audio untuk dikirim
  const prepareAudioForSend = async (): Promise<{
    file: string;
    file_name: string;
    file_type: string;
    transcript: string;
  }> => {
    if (!audioBlob) throw new Error("No audio recorded");

    const base64Audio = await blobToBase64(audioBlob);
    const transcript = await transcribeAudio(audioBlob);

    return {
      file: base64Audio,
      file_name: `voice_message_${Date.now()}.webm`,
      file_type: "audio/webm",
      transcript,
    };
  };

  return {
    isRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
    prepareAudioForSend,
    hasRecording: !!audioBlob,
  };
};
