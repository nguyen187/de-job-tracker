const fs=require("fs");const html=fs.readFileSync(__dirname+"/../de-job-tracker.html","utf8");const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const el=()=>({innerHTML:"",textContent:"",hidden:false,value:"",style:{},scrollIntoView(){},focus(){},setSelectionRange(){},querySelector(){return null},addEventListener(){}});const els={};
global.document={querySelector:s=>els[s]||(els[s]=el()),querySelectorAll:()=>[],addEventListener(){},styleSheets:[],body:{classList:{contains:()=>false,toggle(){},add(){}}}};global.window=global;global.addEventListener=()=>{};global.scrollTo=()=>{};global.scrollY=0;global.location={hash:""};global.localStorage={getItem:()=>null,setItem(){}};
eval(js.replace(/\/\* =+ Boot =+ \*\/[\s\S]*$/, "")+";global.__b={state,render,MATCH_MEMO,SAMPLE_JDS,SAMPLE_CV,detectSkills};");
const B=global.__b; B.state.profile={cvText:B.SAMPLE_CV,skills:B.detectSkills(B.SAMPLE_CV),years:4};
for(let i=0;i<80;i++){const s=B.SAMPLE_JDS[i%3];B.state.jobs.push({id:"j"+i,title:s.title,company:"C"+i,status:["saved","applied","screen","interview"][i%4],history:[{status:"applied",at:Date.now()-i*864e5}],jd:(s.jd+"\n").repeat(6)});}
const t=(label,fn,n=20)=>{const a=performance.now();for(let i=0;i<n;i++)fn();console.log(label,((performance.now()-a)/n).toFixed(1),"ms/render");};
for (const v of ["overview","jobs","career"]) { location.hash="#"+v; B.MATCH_MEMO.clear(); t(v+" cold",()=>{B.MATCH_MEMO.clear();B.render();},5); t(v+" warm (memo)",()=>B.render()); }
