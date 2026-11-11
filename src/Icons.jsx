import React from 'react';
const paths={
 arrow:'M5 19 19 5M5 5h14v14',
 up:'M12 20V4M5 11l7-7 7 7',
 compare:'M3 8h18m-4-4 4 4-4 4M21 16H3m4-4-4 4 4 4',
 close:'m6 6 12 12M18 6 6 18',
 plus:'M12 5v14M5 12h14',
 reset:'M4 10a8 8 0 1 1 1 7M4 4v6h6',
 cube:'m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10',
 star:'M12 1v22M1 12h22M4.2 4.2l15.6 15.6M19.8 4.2 4.2 19.8',
 wall:'M3 3h18v18H3zM7 7h10v10H7z',
 room:'M3 21V5l9-3 9 3v16H3ZM12 2v12m-9 7 9-7 9 7',
 aperture:'m12 2 8.7 5v10L12 22l-8.7-5V7ZM12 2l5.2 9M20.7 7H10.3m10.4 10-5.2-9M12 22l-5.2-9M3.3 17h10.4M3.3 7l5.2 9',
 pixels:'M4 4h5v5H4zM15 4h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5z',
 check:'m5 12 4 4L19 6',
};
export function Icon({name,size=18,...props}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]||paths.star}/></svg>}
