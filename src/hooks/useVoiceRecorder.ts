// src/hooks/useVoiceRecorder.ts
import { useState, useRef, useCallback } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  // Gunakan react-speech-recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const startRecording = async () => {
    try {
      // Reset transcript sebelumnya
      resetTranscript();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

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

        // Stop speech recognition
        SpeechRecognition.stopListening();

        // Cleanup stream
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start media recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start speech recognition untuk transkripsi real-time
      if (browserSupportsSpeechRecognition) {
        SpeechRecognition.startListening({
          continuous: true,
          language: "id-ID", // Bahasa Indonesia
        });
      }

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
      SpeechRecognition.stopListening();
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl("");
    setRecordingTime(0);
    resetTranscript();
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Enhanced transcription dengan fallback
  const transcribeAudio = async (): Promise<string> => {
    setIsTranscribing(true);

    try {
      // Jika speech recognition berhasil dan ada transcript
      if (transcript && transcript.trim().length > 0) {
        console.log("✅ Using speech recognition transcript:", transcript);
        return transcript.trim();
      }

      // Fallback: Manual input
      console.log("⚠️ No speech recognition result, using manual input");
      const manualTranscript = await new Promise<string>((resolve) => {
        // Untuk production, bisa ganti dengan API external seperti:
        // - Google Cloud Speech-to-Text
        // - OpenAI Whisper
        // - Azure Speech Services

        const userInput = prompt(
          "Transkripsi otomatis tidak tersedia. Silakan ketik transkripsi pesan suara Anda:",
          transcript || ""
        );
        resolve(userInput || "🎤 Pesan suara");
      });

      return manualTranscript;
    } catch (error) {
      console.error("Transcription error:", error);
      return "🎤 Pesan suara";
    } finally {
      setIsTranscribing(false);
    }
  };

  // Manual edit transcript
  const editTranscript = useCallback(() => {
    const newTranscript = prompt("Edit transkripsi:", transcript);
    if (newTranscript !== null) {
      resetTranscript();
      // Kita tidak bisa langsung set transcript, jadi kita handle di prepareAudioForSend
    }
  }, [transcript, resetTranscript]);

  // Prepare audio untuk dikirim
  const prepareAudioForSend = async (): Promise<{
    file: string;
    file_name: string;
    file_type: string;
    transcript: string;
  }> => {
    if (!audioBlob) throw new Error("No audio recorded");

    const base64Audio = await blobToBase64(audioBlob);

    // Dapatkan transcript
    const finalTranscript = await transcribeAudio();

    return {
      file: base64Audio,
      file_name: `voice_message_${Date.now()}.webm`,
      file_type: "audio/webm",
      transcript: finalTranscript,
    };
  };

  return {
    isRecording,
    audioBlob,
    audioUrl,
    recordingTime,
    transcript,
    isTranscribing,
    listening,
    browserSupportsSpeechRecognition,
    startRecording,
    stopRecording,
    cancelRecording,
    prepareAudioForSend,
    editTranscript,
    hasRecording: !!audioBlob,
  };
};
