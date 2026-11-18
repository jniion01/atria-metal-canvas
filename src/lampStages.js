// One timeline: the shell leaves first, then the diffuser, then the parts on the cover.
export function lampStages(explode){
 const e=explode/100,c=v=>Math.min(1,Math.max(0,v));
 return {shell:c(e/.4),acrylic:c((e-.4)/.25),parts:c((e-.65)/.35)};
}
