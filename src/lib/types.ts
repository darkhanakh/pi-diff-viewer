export interface Annotation {
	id: string;
	file: string;
	side: "additions" | "deletions";
	startLine: number;
	endLine: number;
	comment: string;
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
