import type { Annotation } from "./types";

// Global reactive annotation store — shared between all components
let annotations = $state<Annotation[]>([]);

export function getAnnotations() {
	return {
		get list() {
			return annotations;
		},
		get count() {
			return annotations.length;
		},
	};
}

export function addAnnotation(annotation: Annotation) {
	annotations = [...annotations, annotation];
}

export function removeAnnotation(id: string) {
	annotations = annotations.filter((a) => a.id !== id);
}

export function resetAnnotations() {
	annotations = [];
}

export function getAnnotationsForFile(fileName: string): Annotation[] {
	return annotations.filter((a) => a.file === fileName);
}
