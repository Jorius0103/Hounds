// O mesmo <svg> que o svg() de js/utils.js monta, com um desenho de ICON (js/utils.js) e as mesmas medidas.
export function Icon({paths, size, stroke = 2}: {paths: string; size: number; stroke?: number}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{__html: paths}}
    />
  );
}
