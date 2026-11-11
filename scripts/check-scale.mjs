import assert from 'node:assert/strict';
import {dimensions,cameraDistance} from '../src/dimensions.js';
assert.equal(dimensions.a3.width,.297);
assert.equal(dimensions.a3.height,.420);
assert.equal(dimensions.large.width,1);
assert.equal(dimensions.large.height,1.5);
for(const aspect of [.55,1,1.7]){
 assert.equal(cameraDistance('a3','scale',aspect),cameraDistance('large','scale',aspect),'Comparison must keep the same camera');
 assert.ok(dimensions.large.height/cameraDistance('large','object',aspect)>dimensions.a3.height/cameraDistance('a3','object',aspect),'Large format must appear larger');
}
console.log('Physical dimensions and comparison camera checks passed');
