"use client";

import { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ---------- CAMERA FUNCTIONS ---------- */

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Camera not supported in this browser.");
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraOn(true);
    } catch (error) {
      alert("Please allow camera permission.");
    }
  };

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      alert("Unable to switch camera.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], "captured.jpg", {
          type: "image/jpeg",
        });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(blob));
      }
    }, "image/jpeg");
  };

  /* ---------- ANALYZE ---------- */

  const handleAnalyze = async () => {
    if (!file) {
      alert("Please upload or capture an image");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }

    setLoading(false);
  };

  /* ---------- CONVERSIONS ---------- */

  const convertNitrite = (value: string) => {
    if (value?.toLowerCase() === "positive") return 100;
    return 30;
  };

  const convertLeukocytes = (value: string) => {
    switch (value?.toLowerCase()) {
      case "moderate":
        return 65;
      case "high":
        return 100;
      default:
        return 30;
    }
  };

  const convertPH = (value: string) => {
    switch (value?.toLowerCase()) {
      case "alkaline":
        return 100;
      case "neutral":
        return 65;
      default:
        return 30;
    }
  };

  const chartData = result
    ? [
        { name: "Nitrite", value: convertNitrite(result.nitrite) },
        { name: "Leukocytes", value: convertLeukocytes(result.leukocytes) },
        { name: "pH", value: convertPH(result.ph) },
      ]
    : [];

  /* ---------- REPORT DOWNLOAD ---------- */

  const downloadReport = () => {
    if (!result) return;

    const content = `
UTISHAP - UTI Strip Analysis Report
-----------------------------------

Nitrite: ${result.nitrite}
Leukocytes: ${result.leukocytes}
pH: ${result.ph}

Risk Level: ${result.risk_level}
Risk Score: ${result.risk_score}%

Clinical Explanation:
${result.clinical_explanation}

Guidance:
${result.guidance}

Generated on: ${new Date().toLocaleString()}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "UTISHAP_Report.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  const formatGuidance = (text: string) => {
    if (!text) return [];

    return text.split(/\d\.\s/).filter((item) => item.trim() !== "");
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#fff9fb] via-[#ffeef4] to-[#ffe3ec] text-gray-800 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 py-20 space-y-16">

        {/* HEADER */}

        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-pink-600">
            UTISHAP
          </h1>
          <p className="text-pink-500 text-lg">
            AI-Powered UTI Strip Analysis
          </p>
        </div>

        {/* UPLOAD */}

        <div className="bg-white shadow-xl border border-pink-200 p-10 rounded-3xl space-y-6">

          <h2 className="text-xl font-semibold text-gray-800">
            Upload or Take Urine Test Strip Image
          </h2>

          <button
            onClick={startCamera}
            className="w-full bg-pink-400 text-white py-3 rounded-xl font-semibold shadow-md hover:bg-pink-500 transition-all"
          >
            Open Camera
          </button>

          {cameraOn && (
            <div className="text-center space-y-4">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-64 mx-auto rounded-2xl shadow-md"
              />

              <div className="flex justify-center gap-4">

                <button
                  onClick={capturePhoto}
                  className="bg-pink-500 text-white px-4 py-2 rounded-xl shadow-md hover:bg-pink-600 transition"
                >
                  Capture
                </button>

                <button
                  onClick={switchCamera}
                  className="bg-gray-600 text-white px-4 py-2 rounded-xl shadow-md hover:bg-gray-700 transition"
                >
                  Switch Camera
                </button>

              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null;
              setFile(selectedFile);
              if (selectedFile) {
                setPreview(URL.createObjectURL(selectedFile));
              }
            }}
            className="w-full p-3 border border-pink-200 rounded-xl"
          />

          {preview && (
            <div className="mt-6 text-center">
              <img
                src={preview}
                alt="Preview"
                className="w-64 mx-auto rounded-2xl shadow-md"
              />
            </div>
          )}

          <button
            onClick={handleAnalyze}
            className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold shadow-md hover:bg-pink-600 transition"
          >
            {loading ? "Analyzing..." : "Analyze Strip"}
          </button>

        </div>

        {/* RESULTS */}

        {result && (
          <div className="bg-white shadow-xl border border-pink-200 p-10 rounded-3xl space-y-10">

            <h2 className="text-2xl font-semibold text-center">
              Analysis Results
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <ResultCard title="Nitrite" value={result.nitrite} />
              <ResultCard title="Leukocytes" value={result.leukocytes} />
              <ResultCard title="pH" value={result.ph} />
            </div>

            <div className="h-52 max-w-xl mx-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => {
                      let color = "#22c55e";
                      if (entry.value >= 100) color = "#ef4444";
                      else if (entry.value >= 60) color = "#f59e0b";
                      return <Cell key={index} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center space-y-2">
              <p className="text-xl font-semibold">
                Risk Level: {result.risk_level}
              </p>
              <p className="text-pink-600">
                Risk Score: {result.risk_score}%
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">
                Clinical Explanation
              </h3>
              <div className="bg-pink-50 border border-pink-200 p-6 rounded-xl text-gray-700 leading-relaxed">
                {result.clinical_explanation}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">
                Recommendations
              </h3>
              <ul className="bg-pink-50 border border-pink-200 p-6 rounded-xl space-y-3 text-gray-700">
                {formatGuidance(result.guidance).map((item: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-pink-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center pt-6">
              <button
                onClick={downloadReport}
                className="bg-pink-500 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:bg-pink-600 transition"
              >
                Download Report
              </button>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

function ResultCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-pink-50 border border-pink-200 p-6 rounded-2xl shadow-sm">
      <p className="text-pink-500 text-sm">{title}</p>
      <p className="text-2xl font-bold mt-2 text-gray-800">{value}</p>
    </div>
  );
}
