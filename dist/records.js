// Fictional demonstration records. Case totals are independent of ADM length.
export const DOCTORS=[
 {id:'kim',name:'김하늘',initials:'KH',country:'KR',countryName:'대한민국',cases:4123,length:1240,verification:'demo'},
 {id:'alex',name:'Alex Kim',initials:'AK',country:'US',countryName:'미국',cases:1320,length:980,verification:'none'},
 {id:'haruto',name:'Haruto Sato',initials:'HS',country:'JP',countryName:'일본',cases:231,length:760,verification:'none'}
];
export function rankRecords(records){return [...records].sort((a,b)=>b.cases-a.cases||a.id.localeCompare(b.id)).map((d,i)=>({...d,rank:i+1}));}
export function recordTotals(records){return records.reduce((total,d)=>({cases:total.cases+d.cases,length:total.length+d.length}),{cases:0,length:0});}
export const RANKED_DOCTORS=rankRecords(DOCTORS);
