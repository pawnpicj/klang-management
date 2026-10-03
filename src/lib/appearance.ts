export const brandTemplates = [
  {
    key: "teal-command",
    name: "Teal Command",
    description: "ชัดเจน เป็นระเบียบ · Teal / Navy",
    colors: ["#0F766E", "#0B1220", "#5EEAD4"],
  },
  {
    key: "emerald-collective",
    name: "Emerald Collective",
    description: "อบอุ่น เป็นทีม · Forest / Cream",
    colors: ["#175C46", "#DCE8DE", "#D99A31"],
  },
  {
    key: "graphite-signal",
    name: "Graphite Signal",
    description: "คมชัด ทันสมัย · Graphite / Mint",
    colors: ["#11151B", "#31E8A4", "#4CC9F0"],
  },
] as const;
export type BrandTemplate = (typeof brandTemplates)[number]["key"];
export function readTemplate(value: string | null | undefined): BrandTemplate {
  return (
    brandTemplates.find((item) => item.key === value)?.key ?? "teal-command"
  );
}
// Runs before paint so saved appearance applies before React hydrates.
export const appearanceInitScript = `(function(){var r=document.documentElement,t,p;try{t=localStorage.getItem('klang-theme');p=localStorage.getItem('klang-template')}catch(e){}r.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';r.dataset.template=['teal-command','emerald-collective','graphite-signal'].indexOf(p)>=0?p:'teal-command'})();`;
