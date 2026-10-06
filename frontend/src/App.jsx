import { useEffect, useState } from "react";
import axios from "axios";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import SharedFile from "./pages/SharedFile";

import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [showRegister, setShowRegister] = useState(false);

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [trashFiles, setTrashFiles] = useState([]);
  const [activities, setActivities] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState("");

  const [newFolderName, setNewFolderName] = useState("");

  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");

  const authHeaders = {
    Authorization: "Bearer " + token,
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get(
        API_URL + "/api/files",
        {
          headers: authHeaders,
        }
      );

      setFiles(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTrash = async () => {
    try {
      const response = await axios.get(
        API_URL + "/api/files/trash/list",
        {
          headers: authHeaders,
        }
      );

      setTrashFiles(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await axios.get(
        API_URL + "/api/folders",
        {
          headers: authHeaders,
        }
      );

      setFolders(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(
        API_URL + "/api/activity",
        {
          headers: authHeaders,
        }
      );

      setActivities(response.data);
    } catch (error) {
      console.error("Failed to fetch activities", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchFiles();
      fetchFolders();
      fetchActivities();
    }
  }, [isLoggedIn]);

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setMessage("Please enter a folder name");
      return;
    }

    try {
      await axios.post(
        API_URL + "/api/folders",
        {
          name: newFolderName,
        },
        {
          headers: authHeaders,
        }
      );

      setNewFolderName("");
      setMessage("Folder created successfully");

      fetchFolders();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
          "Failed to create folder"
      );
    }
  };

  const deleteFolder = async (id) => {
    const confirmed = window.confirm(
      "Delete this folder? Files inside it will remain but move to the root."
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        API_URL + "/api/folders/" + id,
        {
          headers: authHeaders,
        }
      );

      setMessage("Folder deleted successfully");

      fetchFolders();
      fetchFiles();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage("Failed to delete folder");
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setMessage("Please select a file");
      return;
    }

    const formData = new FormData();

    formData.append("file", selectedFile);

    if (selectedFolder) {
      formData.append("folderId", selectedFolder);
    }

    try {
      await axios.post(
        API_URL + "/api/files/upload",
        formData,
        {
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      setMessage("File uploaded successfully");

      setSelectedFile(null);
      setSelectedFolder("");

      document.getElementById("fileInput").value = "";

      fetchFiles();
      fetchFolders();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
          "Upload failed"
      );
    }
  };

  const downloadFile = async (id, filename) => {
    try {
      const response = await axios.get(
        API_URL + "/api/files/" + id + "/download",
        {
          responseType: "blob",
          headers: authHeaders,
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", filename);

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage("Download failed");
    }
  };

  const createShareLink = async (id) => {
    try {
      const response = await axios.post(
        API_URL + "/api/files/" + id + "/share",
        {},
        {
          headers: authHeaders,
        }
      );

      const shareLink = response.data.shareLink;

      await navigator.clipboard.writeText(
        shareLink
      );

      setMessage(
        "Share link created and copied to clipboard"
      );

      fetchFiles();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
          "Failed to create share link"
      );
    }
  };

  const disableShareLink = async (id) => {
    try {
      await axios.delete(
        API_URL + "/api/files/" + id + "/share",
        {
          headers: authHeaders,
        }
      );

      setMessage("Share link disabled");

      fetchFiles();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage("Failed to disable share link");
    }
  };

  const deleteFile = async (id) => {
    try {
      await axios.patch(
        API_URL + "/api/files/" + id + "/trash",
        {},
        {
          headers: authHeaders,
        }
      );

      setMessage("File moved to trash");

      fetchFiles();
      fetchFolders();
      fetchTrash();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
        "Failed to move file to trash"
      );
    }
  };

  const restoreFile = async (id) => {
    try {
      await axios.patch(
        API_URL + "/api/files/" + id + "/restore",
        {},
        {
          headers: authHeaders,
        }
      );

      setMessage("File restored successfully");

      fetchFiles();
      fetchTrash();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
        "Failed to restore file"
      );
    }
  };

  const permanentlyDeleteFile = async (id) => {
    const confirmed = window.confirm(
      "Permanently delete this file? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        API_URL + "/api/files/" + id + "/permanent",
        {
          headers: authHeaders,
        }
      );

      setMessage("File permanently deleted");

      fetchTrash();
      fetchActivities();
    } catch (error) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
        "Failed to permanently delete file"
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("token");

    setIsLoggedIn(false);
    setFiles([]);
    setFolders([]);
    setActivities([]);
  };

  const totalFiles = files.length;

  const totalStorage = files.reduce(
    (total, file) => total + file.size,
    0
  );

  const filteredFiles = files.filter((file) =>
    file.filename
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!isLoggedIn) {
    if (showRegister) {
      return (
        <Register
          onLogin={() => setShowRegister(false)}
        />
      );
    }

    return (
      <Login
        onLogin={() => setIsLoggedIn(true)}
        onRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div>
      <header>
        <h1>☁️ CloudVault</h1>

        <p>Your simple cloud file storage</p>

        <button onClick={logout}>
          Logout
        </button>
      </header>

      <main>

        {/* STATS */}

        <section className="stats">
          <div className="stat-card">
            <h3>Total Files</h3>
            <p>{totalFiles}</p>
          </div>

          <div className="stat-card">
            <h3>Folders</h3>
            <p>{folders.length}</p>
          </div>

          <div className="stat-card">
            <h3>Storage Used</h3>

            <p>
              {(totalStorage / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </section>


        {/* FOLDERS */}

        <section>
          <h2>📁 Folders</h2>

          <div className="folder-create">
            <input
              type="text"
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) =>
                setNewFolderName(e.target.value)
              }
            />

            <button onClick={createFolder}>
              Create Folder
            </button>
          </div>

          {folders.length === 0 ? (
            <p>No folders created yet.</p>
          ) : (
            <div className="folder-list">
              {folders.map((folder) => (
                <div
                  className="folder-card"
                  key={folder.id}
                >
                  <div>
                    <strong>
                      📁 {folder.name}
                    </strong>

                    <p>
                      {folder._count.files} file
                      {folder._count.files !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      deleteFolder(folder.id)
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* UPLOAD */}

        <section>
          <h2>📤 Upload File</h2>

          <input
            id="fileInput"
            type="file"
            onChange={(e) =>
              setSelectedFile(e.target.files[0])
            }
          />

          <div className="upload-folder">
            <label>
              Upload to:
            </label>

            <select
              value={selectedFolder}
              onChange={(e) =>
                setSelectedFolder(e.target.value)
              }
            >
              <option value="">
                Root
              </option>

              {folders.map((folder) => (
                <option
                  key={folder.id}
                  value={folder.id}
                >
                  📁 {folder.name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={uploadFile}>
            Upload
          </button>

          {message && (
            <p>{message}</p>
          )}
        </section>


        {/* FILES */}

        <section>
          <h2>📄 My Files</h2>

          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="search-input"
          />

          {filteredFiles.length === 0 ? (
            <p>
              {search
                ? "No matching files found."
                : "No files uploaded yet."}
            </p>
          ) : (
            filteredFiles.map((file) => (
              <div
                className="file-row"
                key={file.id}
              >
                <div className="file-name">
                  📄{" "}

                  <strong>
                    {file.filename}
                  </strong>

                  {file.folder && (
                    <span className="file-folder">
                      📁 {file.folder.name}
                    </span>
                  )}
                </div>

                <div className="file-size">
                  {(file.size / 1024).toFixed(2)} KB
                </div>

                <button
                  className="download-btn"
                  onClick={() =>
                    downloadFile(
                      file.id,
                      file.filename
                    )
                  }
                >
                  Download
                </button>

                {file.shareToken ? (
                  <button
                    className="share-btn"
                    onClick={() =>
                      disableShareLink(file.id)
                    }
                  >
                    Disable Share
                  </button>
                ) : (
                  <button
                    className="share-btn"
                    onClick={() =>
                      createShareLink(file.id)
                    }
                  >
                    Share
                  </button>
                )}

                <button
                  className="delete-btn"
                  onClick={() =>
                    deleteFile(file.id)
                  }
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </section>


        {/* ACTIVITY */}

        <section>
          <h2>📋 Recent Activity</h2>

          {activities.length === 0 ? (
            <p className="empty-message">
              No activity yet.
            </p>
          ) : (
            <div className="activity-list">

              {activities.map((activity) => (
                <div
                  className="activity-card"
                  key={activity.id}
                >

                  <div>
                    <strong>
                      {activity.action
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </strong>

                    <p>
                      {activity.details}
                    </p>
                  </div>

                  <span>
                    {new Date(
                      activity.createdAt
                    ).toLocaleString()}
                  </span>

                </div>
              ))}

            </div>
          )}
        </section>

        {/* TRASH */}

        <section>
          <h2>🗑️ Trash</h2>

          {trashFiles.length === 0 ? (
            <p className="empty-message">
              Trash is empty
            </p>
          ) : (
            <div className="file-list">
              {trashFiles.map((file) => (
                <div
                  className="file-row"
                  key={file.id}
                >
                  <div className="file-name">
                    🗑️{" "}
                    <strong>
                      {file.filename}
                    </strong>

                    <p>
                      Deleted on{" "}
                      {new Date(
                        file.deletedAt
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="file-size">
                    {(file.size / 1024).toFixed(2)} KB
                  </div>

                  <button
                    onClick={() =>
                      restoreFile(file.id)
                    }
                  >
                    Restore
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() =>
                      permanentlyDeleteFile(file.id)
                    }
                  >
                    Delete Permanently
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}


function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/share/:token"
          element={<SharedFile />}
        />

        <Route
          path="*"
          element={<Dashboard />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
