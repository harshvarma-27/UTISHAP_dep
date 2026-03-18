"use client";

import { useRef, useState } from "react";

export default function ImageUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Upload or Take a Picture</h2>

      <button
        onClick={openFilePicker}
        style={{
          padding: "10px 20px",
          margin: "10px",
          cursor: "pointer",
        }}
      >
        Choose / Take Photo
      </button>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {preview && (
        <div style={{ marginTop: "20px" }}>
          <img
            src={preview}
            alt="Preview"
            style={{ width: "300px", borderRadius: "10px" }}
          />
        </div>
      )}
    </div>
  );
}