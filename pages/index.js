import { useState, useRef } from 'react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required for recording.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <main style={{ padding: 40, fontFamily: 'Arial, sans-serif' }}>
      <h1>🎤 Voice Recorder</h1>
      <p>Test voice recording from browser (iPhone/Android supported)</p>
      <button onClick={isRecording ? stopRecording : startRecording} style={{ padding: '10px 20px', fontSize: 16 }}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {audioURL && (
        <div style={{ marginTop: 30 }}>
          <h3>Recorded Audio:</h3>
          <audio src={audioURL} controls />
        </div>
      )}
    </main>
  );
}
