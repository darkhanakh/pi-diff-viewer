import type { Annotation, DiffPayload } from "./types";

let ws: WebSocket | null = null;
let connected = $state(false);
let diffPayload = $state<DiffPayload | null>(null);
let error = $state<string | null>(null);

export function getState() {
	return {
		get connected() {
			return connected;
		},
		get diffPayload() {
			return diffPayload;
		},
		get error() {
			return error;
		},
	};
}

export function connect() {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	const url = `${protocol}//${window.location.host}`;

	ws = new WebSocket(url);

	ws.onopen = () => {
		connected = true;
		error = null;
	};

	ws.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			if (data.type === "diff-data") {
				diffPayload = data as DiffPayload;
			}
		} catch {
			// Ignore malformed messages
		}
	};

	ws.onerror = () => {
		error = "WebSocket connection error";
	};

	ws.onclose = () => {
		connected = false;
	};
}

export function submitReview(annotations: Annotation[]) {
	if (!ws || ws.readyState !== WebSocket.OPEN) return;
	ws.send(
		JSON.stringify({
			type: "submit-review",
			annotations: annotations.map(({ id, ...rest }) => rest),
		}),
	);
}

export function disconnect() {
	if (ws) {
		ws.close();
		ws = null;
	}
}
