// pages/index.js
import { useRef, useState } from "react";
import * as wavEncoder from "wav-encoder";
import { OpenAI } from "openai";

export default function Home() {
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingSoap, setLoadingSoap] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const processorRef = useRef(null);
  const buffersRef = useRef([]);

  const ACCESS_CODE = process.env.NEXT_PUBLIC_ACCESS_CODE;
  const client = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, dangerouslyAllowBrowser: true });

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

    processorRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

    const audioContext = audioContextRef.current;
    const buffers = buffersRef.current;
    const totalLength = buffers.reduce((acc, cur) => acc + cur.length, 0);
    const mergedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
      mergedBuffer.set(b, offset);
      offset += b.length;
    }

    const wavData = await wavEncoder.encode({
      sampleRate: audioContext.sampleRate,
      channelData: [mergedBuffer],
    });

    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    // Transcription
    try {
      setLoadingTranscript(true);
      const file = new File([blob], "recording.wav", { type: "audio/wav" });
      const resp = await client.audio.transcriptions.create({
        model: "whisper-1",
        file,
        language: "en",
      });
      setTranscript(resp.text);
    } catch (e) {
      setError("Transcription failed");
      console.error(e);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const generateSoap = async () => {
    try {
      setLoadingSoap(true);
      const prompt = `You are a medical documentation assistant in STRICT SCRIBE MODE.

- Generate a SOAP note based only on this transcript.
- Write it in English.
- Do NOT invent or infer anything not explicitly said.
- Use this format:

Subjective:
- Chief Complaint (CC):
- History of Present Illness (HPI):
- Past Medical History (PMH):

Objective:
- Allergies:
- Vital Signs:
- Physical Exam:
- Diagnostic Results:

Assessment:
- Primary Diagnosis:
- Differential Diagnoses:

Plan:
- Treatment:
- Medications Prescribed:
- Follow-up Instructions:

Transcript:
'''${transcript}'''`;

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      setSoapNote(response.choices[0].message.content);
    } catch (e) {
      setError("SOAP generation failed");
      console.error(e);
    } finally {
      setLoadingSoap(false);

    }
  };

  const soapFields = [
    "Chief Complaint (CC):",
    "History of Present Illness (HPI):",
    "Past Medical History (PMH):",
    "Allergies:",
    "Vital Signs:",
    "Physical Exam:",
    "Diagnostic Results:",
    "Primary Diagnosis:",
    "Differential Diagnoses:",
    "Treatment:",
    "Medications Prescribed:",
    "Follow-up Instructions:",
  ];

  if (!unlocked) {
    return (
      <main style={{ padding: 40 }}>
        <h2>🔐 AI SOAP Assistant - Physician Access</h2>
        <input
          type="password"
          placeholder="Enter password to access"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
        />
        <button onClick={() => setUnlocked(passwordInput === ACCESS_CODE)}>Submit</button>
        {passwordInput && passwordInput !== ACCESS_CODE && <p style={{ color: "red" }}>Invalid password</p>}
      </main>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 900 }}>
      <h2>🩺 Voice-to-SOAP Medical Assistant</h2>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      {audioUrl && (
        <>
          <h3 style={{ marginTop: 20 }}>🎧 Playback</h3>
          <audio controls src={audioUrl} style={{ width: "100%" }} />
        </>
      )}

      <h3 style={{ marginTop: 20 }}>📝 Transcript</h3>
      <textarea
        rows={8}
        style={{ width: "100%" }}
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />
      {loadingTranscript && (
        <p style={{ color: "#555", marginTop: 10 }}>⏳ Transcribing...</p>
      )}

      <button style={{ marginTop: 10 }} onClick={generateSoap} disabled={loading || !transcript}>
        Generate SOAP Note
      </button>
      {loadingSoap && (
        <p style={{ color: "#555", marginTop: 10 }}>🧠 Generating SOAP Note...</p>
      )}

      {soapNote && (
        <div style={{ marginTop: 20 }}>
          <h3>📄 Detailed SOAP Note</h3>
          {soapFields.map((field) => {
            const section = soapNote.includes(field)
              ? soapNote.split(field)[1].split("\n")[0].trim()
              : "";
            return (
              <div key={field} style={{ marginBottom: 10 }}>
                <strong>{field}</strong>
                <textarea
                  rows={3}
                  defaultValue={section}
                  style={{ width: "100%", marginTop: 5 }}
                />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
