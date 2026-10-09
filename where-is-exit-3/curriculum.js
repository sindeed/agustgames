import {GYM} from './gym-layout.js?v=20261009-geography-3';
export const STORY = 'En gång åkte jag i en blå bil i skogen, men sedan såg jag en mystisk skugga vid ett träd. Jag kunde inte köra förbi där, så jag tog den andra vägen i stället. Då kom jag till en stor fabrik! Jag gick ut för att titta närmare på den när ett träd föll på min bil, så att den gick sönder. Då öppnades dörren till fabriken och jag gick in. Det var sex våningar i fabriken. Jag skulle hitta fem lampor till en kontakt. Jag hittade alla. Sedan såg jag ett monster, så jag sprang från monstret. Jag hade satt in alla lampor i eluttaget så att jag kunde gå ut igen. Där är sagan slut.';
export const SUBJECTS = [
 {id:'math',name:'Matte',short:'MA',x:-15,z:36,questions:['7 × 6 =','8 × 4 =','9 × 7 ='],answers:['42','32','63']},
 {id:'swedish',name:'Svenska',short:'SV',x:-15,z:10,questions:['Skriv av sagan i din bok.'],answers:[STORY]},
 {id:'english',name:'Engelska',short:'EN',x:-15,z:-16,questions:['monster →','skola →','bok →','nyckel →','skugga →'],answers:['monster','school','book','key','shadow']},
 {id:'social',name:'SO',short:'SO',x:15,z:36,questions:['Vad gjorde människorna vapen av på stenåldern?','Nämn en av de första städerna som fanns i Sverige.','Vad kallas de skrivtecken som vikingarna använde?'],answers:['sten och trä','Birka','Runor']},
 {id:'science',name:'NO',short:'NO',x:15,z:10,questions:['Vilken sorts skog finns det mest av i Sverige?','Nämn tre rovdjur.','Vad kallas det när en larv blir en puppa och sedan en fjäril?'],answers:['Barrskog','räv lodjur varg','Fullständig förvandling']},
 {id:'geography',name:'Geografi',short:'GE',x:15,z:-40},
 {id:'gym',name:'Idrott',short:'ID',x:GYM.x,z:GYM.z}
];
export function normalize(s){return s.normalize('NFC').toLocaleLowerCase('sv').replace(/[.,!?;:"“”–—]/g,' ').replace(/\s+/g,' ').trim()}
export function correct(subject,index,text){const n=normalize(text);if(subject==='science'&&index===1)return n.replace(/\boch\b/g,' ').split(/\s+/).filter(Boolean).sort().join(' ')==='lodjur räv varg';if(subject==='social'&&index===0)return ['sten och trä','trä och sten','sten trä','trä sten'].includes(n);return n===normalize(SUBJECTS.find(s=>s.id===subject).answers[index])}
