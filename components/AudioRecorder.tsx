
import React, { useState, useRef } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (base64Audio: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          onRecordingComplete(base64Data);
        };
        reader.readAsDataURL(blob);
        chunksRef.current = [];
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-700 rounded-lg bg-gray-850">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-gray-700'}`}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-neon-blue hover:bg-neon-purple'
          }`}
        >
          {isRecording ? (
            <div className="w-4 h-4 bg-white rounded-sm" />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>
      <p className="text-sm text-gray-400">
        {isRecording ? "Recording... (Click to stop)" : "Record a 10s voice sample"}
      </p>
    </div>
  );
};
