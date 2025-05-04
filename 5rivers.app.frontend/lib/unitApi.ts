// Utility functions for Unit API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9999";

export async function fetchUnits() {
  const res = await fetch(`${API_URL}/units`);
  if (!res.ok) throw new Error("Failed to fetch units");
  return res.json();
}

export async function deleteUnit(id: string) {
  const res = await fetch(`${API_URL}/units/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete unit");
  return res.json();
}

export async function createUnit(data: { name: string; description?: string }) {
  const res = await fetch(`${API_URL}/units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create unit");
  return res.json();
}

export async function updateUnit(
  id: string,
  data: { name: string; description?: string }
) {
  const res = await fetch(`${API_URL}/units/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update unit");
  return res.json();
}
