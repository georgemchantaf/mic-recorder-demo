// pages/api/soap.js
import formidable from "formidable";
import fs from "fs";
import { OpenAI } from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const transcribeAudio = async (filePath) => {
  const fileStream = fs.createReadStream(filePath);
  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: fileStream,
    language: "en",
  });
  return response.text;
};

const generateSOAP = async (transcript) => {
  const prompt = `
You are a medical documentation assistant in STRICT SCRIBE MODE.

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
'''${transcript}'''
  `.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return response.choices[0].message.content.trim();
};

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload error" });

    const file = files.file;
    const filePath = file.filepath;

    try {
      const transcript = await transcribeAudio(filePath);
      const soap = await generateSOAP(transcript);
      return res.status(200).json({ transcript, soap });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Transcription or SOAP generation failed" });
    }
  });
}
