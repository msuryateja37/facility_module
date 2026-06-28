const API_BASE = "http://localhost:5500/api";

function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Authentication failed");
  }
  return data;
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch statistics");
  return res.json();
}

export async function fetchReviews() {
  const res = await fetch(`${API_BASE}/reviews`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch reviews");
  return res.json();
}

export async function fetchReviewById(id: string) {
  const res = await fetch(`${API_BASE}/reviews/${id}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch review details");
  return res.json();
}

export async function createReview(reviewData: any) {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(reviewData)
  });
  if (!res.ok) throw new Error("Failed to create compliance review");
  return res.json();
}

export async function updateReview(id: string, updates: any) {
  const res = await fetch(`${API_BASE}/reviews/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error("Failed to update review");
  return res.json();
}

export async function uploadMockFile(id: string, fileName: string, fileSize: string, fileType: string) {
  const res = await fetch(`${API_BASE}/reviews/${id}/upload`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ fileName, fileSize, fileType })
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}

export async function fetchArchiveLogs() {
  const res = await fetch(`${API_BASE}/archive`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch archive logs");
  return res.json();
}

export async function createArchiveLog(archiveData: any) {
  const res = await fetch(`${API_BASE}/archive`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(archiveData)
  });
  if (!res.ok) throw new Error("Failed to archive review");
  return res.json();
}

export async function fetchSystemLogs() {
  const res = await fetch(`${API_BASE}/logs`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch system logs");
  return res.json();
}

export async function sendChatMessage(message: string) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error("Failed to communicate with AI Assistant");
  return res.json();
}

export async function updateProfile(username: string, profileData: any) {
  const res = await fetch(`${API_BASE}/users/${username}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
  if (!res.ok) throw new Error("Failed to update user profile");
  return res.json();
}

export async function fetchProfile(username: string) {
  const res = await fetch(`${API_BASE}/users/${username}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export async function uploadInvoiceAndExtract(fileName: string, fileType: string, fileBase64: string) {
  const res = await fetch(`${API_BASE}/reviews/upload-invoice`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ fileName, fileType, fileBase64 })
  });
  if (!res.ok) throw new Error("Failed to process invoice with Azure Generative AI");
  return res.json();
}
