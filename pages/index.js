import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAudioURL(url);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>🎙️ Record Voice Note</h1>
      <p>Tap to record voice from your browser (works on iPhone and Android).</p>
      <button onClick={isRecording ? stopRecording : startRecording} style={{ padding: '10px 20px', fontSize: 16 }}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {audioURL && (
        <div style={{ marginTop: 20 }}>
          <h3>Playback:</h3>
          <audio src={audioURL} controls />
          <p><i>If you can hear your voice, recording works on your device.</i></p>
        </div>
      )}
    </div>
  );
}
