import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p: Uint8Array, input: Uint8Array) {
  const need = new Uint8Array(84), delta = new Int8Array(84), imm = new Uint8Array(84), valid = new Uint8Array(84);
  for (const x of [0,1,2,3,4,5,6,7,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,34,48,49,50,51,52,64,65,80,81,82,83]) valid[x] = 1;
  imm[1] = 1; imm[2] = 4; imm[48] = imm[49] = imm[50] = imm[51] = 2;
  for (const x of [1,2,82]) delta[x] = 1;
  need[3]=need[4]=need[23]=need[27]=need[49]=need[50]=need[64]=need[80]=need[81]=need[83]=1;
  delta[3]=delta[49]=delta[50]=delta[80]=delta[81]=delta[83]=-1;
  delta[4]=1; need[5]=need[6]=2; delta[6]=1; need[7]=3; need[65]=2; delta[65]=-2;
  for (const x of [16,17,18,19,20,21,22,24,25,26,28,29,30,32,33,34]) { need[x]=2; delta[x]=-1; }
  const d = new Int32Array(256), c = new Int32Array(64), m = new Int32Array(256), out: number[] = [];
  let sp=0, cp=0, pc=0, ip=0, steps=0;
  const trap = (code:number) => ({out,code});
  for (;;) {
    if (steps === 1000000) return trap(10);
    if (pc < 0 || pc >= p.length) return trap(9);
    const op = p[pc];
    if (op >= valid.length || !valid[op]) return trap(5);
    const z = imm[op];
    if (pc + z >= p.length) return trap(9);
    steps++;
    const next = pc + 1 + z;
    if (sp < need[op]) return trap(2);
    if (sp + delta[op] > 256) return trap(3);
    pc = next;
    switch (op) {
      case 0: return {out,code:0};
      case 1: d[sp++] = (p[next-1]<<24)>>24; break;
      case 2: d[sp++] = p[next-4] | p[next-3]<<8 | p[next-2]<<16 | p[next-1]<<24; break;
      case 3: sp--; break;
      case 4: d[sp]=d[sp-1]; sp++; break;
      case 5: { const t=d[sp-1]; d[sp-1]=d[sp-2]; d[sp-2]=t; break; }
      case 6: d[sp]=d[sp-2]; sp++; break;
      case 7: { const a=d[sp-3]; d[sp-3]=d[sp-2]; d[sp-2]=d[sp-1]; d[sp-1]=a; break; }
      case 23: d[sp-1]=-d[sp-1]|0; break;
      case 27: d[sp-1]=~d[sp-1]; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b=d[sp-1], a=d[sp-2]; let r=0;
        switch(op) {
          case 16:r=a+b|0;break; case 17:r=a-b|0;break; case 18:r=Math.imul(a,b);break;
          case 19:if(!b)return trap(4);r=a===-2147483648&&b===-1?a:a/b|0;break;
          case 20:if(!b)return trap(4);r=b===-1?0:a%b|0;break;
          case 21:if(!b)return trap(4);r=Math.floor((a>>>0)/(b>>>0))|0;break;
          case 22:if(!b)return trap(4);r=(a>>>0)%(b>>>0)|0;break;
          case 24:r=a&b;break;case 25:r=a|b;break;case 26:r=a^b;break;
          case 28:r=a<<(b&31);break;case 29:r=a>>(b&31);break;case 30:r=a>>>(b&31)|0;break;
          case 32:r=+(a===b);break;case 33:r=+(a<b);break;case 34:r=+((a>>>0)<(b>>>0));break;
        }
        sp-=2;d[sp++]=r;break;
      }
      case 48: case 49: case 50: {
        const off=(p[next-2]|p[next-1]<<8)<<16>>16;
        const take=op===48 || (op===49)===(d[--sp]===0);
        if(take)pc=next+off;
        break;
      }
      case 51:
        if(cp===64)return trap(7);
        c[cp++]=next;pc=p[next-2]|p[next-1]<<8;break;
      case 52: if(!cp)return trap(8);pc=c[--cp];break;
      case 64: { const a=d[sp-1];if(a<0||a>=256)return trap(6);d[sp-1]=m[a];break; }
      case 65: { const a=d[sp-1];if(a<0||a>=256)return trap(6);m[a]=d[sp-2];sp-=2;break; }
      case 80: { const s=String(d[sp-1]);if(out.length+s.length>65536)return trap(11);sp--;for(let i=0;i<s.length;i++)out.push(s.charCodeAt(i));break; }
      case 81: if(out.length===65536)return trap(11);out.push(d[--sp]&255);break;
      case 82: d[sp++]=ip<input.length?input[ip++]:-1;break;
      case 83: return {out,code:d[--sp]&255};
    }
  }
}

const I=process.env.MAKEFUN_INPUT_DIR??'/input', O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
  const dir=join(O,id), r=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
  mkdirSync(dir,{recursive:true}); writeFileSync(join(dir,'stdout.bin'),Uint8Array.from(r.out)); writeFileSync(join(dir,'exit.txt'),`${r.code}\n`);
}
