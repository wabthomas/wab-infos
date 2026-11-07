import fs from 'node:fs';
const file = 'tests/rh-contract-workflow.test.mjs';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(
  "{...input,birthPlace:'',signaturePlace:'',signatureDate:null}",
  "{...input,birthPlace:'',signaturePlace:'',signatureDate:null,displayOptions:{job:true,location:true,startDate:true,endDate:true,salary:true}}",
);
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('displayOptions:{job:true') ? 'OK' : 'MISS');
