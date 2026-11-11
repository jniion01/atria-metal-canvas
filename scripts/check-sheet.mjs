import assert from 'node:assert/strict';
import {shouldOpenSheet} from '../src/sheet.js';
const checks=[
 ['short upward drag stays closed',{start:648,delta:-50,elapsed:500,max:648},false],
 ['long upward drag opens',{start:648,delta:-400,elapsed:1500,max:648},true],
 ['upward flick opens',{start:648,delta:-100,elapsed:100,max:648},true],
 ['short downward drag stays open',{start:0,delta:50,elapsed:500,max:648},true],
 ['long downward drag closes',{start:0,delta:400,elapsed:1500,max:648},false],
 ['downward flick closes',{start:0,delta:100,elapsed:100,max:648},false],
 ['overscroll above remains open',{start:0,delta:-100,elapsed:600,max:648},true],
 ['overscroll below remains closed',{start:648,delta:100,elapsed:600,max:648},false]
];
for(const [label,input,expected] of checks)assert.equal(shouldOpenSheet(input),expected,label);
console.log(`${checks.length} sheet gesture checks passed`);
