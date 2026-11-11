export function shouldOpenSheet({start,delta,elapsed,max}) {
 const position=Math.max(0,Math.min(max,start+delta));
 const velocity=delta/Math.max(1,elapsed);
 return Math.abs(velocity)>.35?velocity<0:position<max*.5;
}
