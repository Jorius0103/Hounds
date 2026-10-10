// O código busca elementos por id ou seletor e usa direto .value, .disabled, .src...
// Para a checagem não exigir uma conversão de tipo em cada uso, esses elementos
// são tratados como "qualquer elemento de formulário, imagem ou iframe".

// type, width e height têm tipos diferentes conforme o elemento, então ficam fora da interseção.
type ElSemConflito<T> = Omit<T, 'type' | 'width' | 'height'>;
type AnyEl = HTMLElement & ElSemConflito<HTMLInputElement> & ElSemConflito<HTMLButtonElement> & ElSemConflito<HTMLSelectElement> &
  ElSemConflito<HTMLTextAreaElement> & ElSemConflito<HTMLImageElement> & ElSemConflito<HTMLIFrameElement> &
  ElSemConflito<HTMLFormElement> & ElSemConflito<HTMLOutputElement> & { type: string; width: number | string; height: number | string };

interface ParentNode {
  querySelector(selectors: string): AnyEl | null;
  querySelectorAll(selectors: string): NodeListOf<AnyEl>;
}

interface Element {
  closest(selectors: string): AnyEl | null;
}

interface EventTarget {
  // e.target dos ouvintes: no código é sempre um elemento.
  closest?(selectors: string): AnyEl | null;
  id?: string;
  checked?: boolean;
}
