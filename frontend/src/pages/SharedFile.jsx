import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function SharedFile() {
  const { token } = useParams();

  const [message, setMessage] = useState("Preparing download...");

  useEffect(() => {
    const downloadSharedFile = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/api/files/shared/${token}`,
          {
            responseType: "blob",
          }
        );

        const contentDisposition =
          response.headers["content-disposition"];

        let filename = "shared-file";

        if (contentDisposition) {
          const match =
            contentDisposition.match(
              /filename="(.+)"/
            );

          if (match) {
            filename = match[1];
          }
        }

        const url = window.URL.createObjectURL(
          response.data
        );

        const link = document.createElement("a");

        link.href = url;
        link.setAttribute("download", filename);

        document.body.appendChild(link);

        link.click();

        link.remove();

        window.URL.revokeObjectURL(url);

        setMessage("Download started successfully.");
      } catch (error) {
        console.error(error);

        if (error.response?.status === 410) {
          setMessage("This share link has expired.");
        } else if (error.response?.status === 404) {
          setMessage("This share link is invalid.");
        } else {
          setMessage("Unable to download this file.");
        }
      }
    };

    downloadSharedFile();
  }, [token]);

  return (
    <div className="shared-file-page">
      <div className="shared-file-card">
        <h1>☁️ CloudVault</h1>

        <h2>Shared File</h2>

        <p>{message}</p>

        <p className="shared-file-info">
          This file was shared with you using
          CloudVault.
        </p>
      </div>
    </div>
  );
}

export default SharedFile;