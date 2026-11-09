async function request(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong");
  }
  return data;
}

function post(url, body) {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getSpeech(text) {
  const res = await fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Text to speech failed");
  return res; // read res.body as a stream
}

export const api = {
  speech: getSpeech,
  getRetailers: () => request("/api/retailers"),
  getProducts: () => request("/api/products"),
  getCalls: () => request("/api/calls"),
  chat: (retailerId, messages) => post("/api/chat", { retailer_id: retailerId, messages }),
  endCall: (retailerId, messages) => post("/api/calls", { retailer_id: retailerId, messages }),
};
