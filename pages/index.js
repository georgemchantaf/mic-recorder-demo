import { useRef, useState } from "react";
import * as wavEncoder from "wav-encoder";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const processorRef = useRef(null);
  const buffersRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      buffersRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        buffersRef.current.push(new Float32Array(input));
      };

      sourceNode.connect(processor);
      processor.connect(audioContext.destination);
      processorRef.current = processor;

      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission denied or not available.");
      console.error(err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);

    const audioContext = audioContextRef.current;
    const buffers = buffersRef.current;

    // Disconnect audio graph
    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

    // Merge audio buffers
    const totalLength = buffers.reduce((acc, cur) => acc + cur.length, 0);
    const mergedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      mergedBuffer.set(b, offset);
      offset += b.length;
    }

    console.log("Merged buffer length:", mergedBuffer.length);

    // Encode as WAV
    const wavData = await wavEncoder.encode({
      sampleRate: audioContext.sampleRate,
      channelData: [mergedBuffer],
    });

    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🎤 Voice Recorder (iOS Compatible)</h1>
      <p>Test voice recording from your browser (iPhone/Android supported)</p>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      {audioUrl && (
        <div style={{ marginTop: 20 }}>
          <h3>Recorded Audio:</h3>
          <audio controls src={audioUrl}></audio>
        </div>
      )}
    </div>
  );
}
