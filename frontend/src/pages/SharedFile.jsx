import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function SharedFile() {
  const { token } = useParams();
  const [message, setMessage] = useState("Preparing your download...");

  useEffect(() => {
    let cancelled = false;

    const downloadSharedFile = async () => {
      try {
        // Step 1: Get the JSON response containing the S3 download URL.
        const response = await axios.get(
          `${API_URL}/api/files/shared/${token}`
        );

        const downloadUrl = response.data.downloadUrl;

        if (!downloadUrl) {
          throw new Error("The server did not provide a download URL.");
        }

        // Step 2: Download the actual file from S3.
        const fileResponse = await fetch(downloadUrl);

        if (!fileResponse.ok) {
          throw new Error(`File download failed (${fileResponse.status}).`);
        }

        const blob = await fileResponse.blob();

        // Step 3: Get the original filename from the server's S3 object key.
        const objectKey = decodeURIComponent(
          new URL(downloadUrl).pathname.split("/").pop() || ""
        );

        const filename =
          response.data.filename ||
          objectKey.replace(/^\d+-[a-f0-9]+-/i, "") ||
          "shared-file";

        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Give the browser time to start the download before releasing the URL.
        window.setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
        }, 1000);

        if (!cancelled) {
          setMessage(`Download started: ${filename}`);
        }
      } catch (error) {
        console.error("SHARED FILE DOWNLOAD ERROR:", error);

        if (cancelled) return;

        if (error.response?.status === 410) {
          setMessage("This share link has expired.");
        } else if (error.response?.status === 404) {
          setMessage("This share link is invalid or the file is unavailable.");
        } else {
          setMessage(
            error.message || "Unable to download this shared file."
          );
        }
      }
    };

    downloadSharedFile();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="shared-file-page">
      <div className="shared-file-card">
        <h1>☁️ CloudVault</h1>
        <h2>Shared File</h2>
        <p>{message}</p>
        <p className="shared-file-info">
          This file was shared with you using CloudVault.
        </p>
      </div>
    </div>
  );
}

export default SharedFile;
