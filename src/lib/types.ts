export interface Annotation {
	id: string;
	file: string;
	side: "additions" | "deletions";
	startLine: number;
	endLine: number;
	comment: string;
}

export interface PendingAnnotation {
	id: string;
	file: string;
	side: "additions" | "deletions";
	startLine: number;
	endLine: number;
}

export interface DiffFile {
	name: string;
	oldContents: string;
	newContents: string;
}

export interface DiffPayload {
	type: "diff-data";
	files: DiffFile[];
}

export function formatAnnotationsAsPrompt(annotations: Annotation[]): string {
	if (annotations.length === 0) return "";

	const grouped = new Map<string, Annotation[]>();
	for (const a of annotations) {
		const list = grouped.get(a.file) ?? [];
		list.push(a);
		grouped.set(a.file, list);
	}

	let prompt = "## Code Review Annotations\n\n";
	prompt += "I've reviewed the code changes and have the following annotations. Please address each one:\n\n";

	for (const [file, anns] of grouped) {
		for (const a of anns.sort((x, y) => x.startLine - y.startLine)) {
			const lineRef =
				a.startLine === a.endLine ? `line ${a.startLine}` : `lines ${a.startLine}-${a.endLine}`;
			const side = a.side === "additions" ? "new" : "old";
			prompt += `### \`${file}\` (${lineRef}, ${side} side)\n`;
			prompt += `${a.comment}\n\n`;
		}
	}

	prompt += "---\nPlease address all review annotations above.";
	return prompt;
}
