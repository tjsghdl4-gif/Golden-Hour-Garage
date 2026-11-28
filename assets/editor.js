"use strict";

const W = 1134, H = 661;
const families = [
  {name:"Satisfy",slug:"CardSatisfy",group:"대표 폰트"},
  {name:"Nanum Brush Script",slug:"CardBrush",group:"대표 폰트"},
  {name:"Noto Sans KR",slug:"CardSans",group:"한글"}, ...fontCatalog
];
const validFont = slug => families.some(family => family.slug === slug);
function fontStack(role) {
  return state.fonts[role] + ", CardBrush, CardSans, sans-serif";
}
const designSettings = {
  engraved: {paper:"#14110f", accent:"#e0a369", darkAccent:"#6e3519"},
  embroidered: {paper:"#243519", accent:"#f4be58", darkAccent:"#324619"},
};
const fields = [
  {id:"shop", label:"상호명", english:"Business name", placeholder:"상호명 입력", initial:false, size:46},
  {id:"name", label:"이름", english:"Name", englishPlaceholder:"Representative name", placeholder:"대표 이름", initial:true, size:60},
  {id:"phone", label:"전화번호", english:"Tel.", englishPlaceholder:"Store phone", placeholder:"매장 전화번호", initial:true, size:34, type:"tel"},
  {id:"mobile", label:"휴대폰 번호", english:"Mobile", englishPlaceholder:"Mobile number", placeholder:"휴대폰 번호", initial:true, size:34, type:"tel"},
  {id:"email", label:"이메일", english:"E-mail", englishPlaceholder:"Email address", placeholder:"이메일 주소", initial:false, size:34, type:"email"},
  {id:"address", label:"매장 주소", english:"Add.", englishPlaceholder:"Store address", placeholder:"매장 주소", initial:true, size:34},
  {id:"instagram", label:"인스타그램", english:"Instagram", placeholder:"@아이디 또는 주소", initial:true, qr:true},
  {id:"blog", label:"블로그", english:"Blog", placeholder:"블로그 주소", initial:false, qr:true},
];

const fieldById = Object.fromEntries(fields.map(field=>[field.id,field]));
const textTargets = fields.map(f=>[f.id, f.qr ? f.label+" QR 문구" : f.label]);
const infoFields = fields.filter(f=>!f.qr);
const contactFields = infoFields.filter(f=>f.id!=="shop" && f.id!=="name");
for (const field of infoFields) textTargets.push([field.id+"-label",field.label+" 항목명"]);
textTargets.push(["services","하단 업무 문구"]);

const initial = {
  design:"engraved",
  language:"ko",
  qrScale:100,
  docks:{instagram:"auto",blog:"auto"},
  inks:{shop:"#f3e3c4",label:null,value:"#f3e3c4"},
  logoScale:100,
  showTitles:Object.fromEntries(infoFields.map(f=>[f.id,contactFields.includes(f)])),
  fieldGaps:Object.fromEntries(infoFields.map(f=>[f.id,null])),
  fonts:{shop:"CardSatisfy",info:"CardBrush"},
  positions:{},
  textSizes:Object.fromEntries(textTargets.map(([id])=>[id,100])),
  infoOrder:fields.filter(field=>!field.qr).map(field=>field.id),
  colors:Object.fromEntries(Object.entries(designSettings).map(([key,value])=>[key,value.paper])),
  fields:Object.fromEntries(fields.map(field=>[field.id,{enabled:field.initial,text:""}])),
};
const state = JSON.parse(JSON.stringify(initial));
const published=JSON.parse(document.getElementById("published-settings").textContent);
const storageKey = "golden-hour-garage-editor-v1"+(published.version ? "-"+published.version : "");
function applySettings(saved) {
  if (saved && Object.prototype.hasOwnProperty.call(designSettings,saved.design)) state.design = saved.design;
  if (Number.isInteger(saved?.logoScale) && saved.logoScale>=40 && saved.logoScale<=110) state.logoScale=saved.logoScale;
  for (const role of Object.keys(initial.inks)) {
    const ink=saved?.inks?.[role];
    if (role==="label" && (ink===null || (!saved?.showTitles && ink?.toLowerCase?.()==="#f3e3c4"))) state.inks.label=null;
    else if (/^#[0-9a-f]{6}$/i.test(ink)) state.inks[role]=ink;
  }
  for (const id of Object.keys(initial.docks)) {
    if (["auto","top","middle","bottom"].includes(saved?.docks?.[id])) state.docks[id]=saved.docks[id];
  }
  for (const {id} of infoFields) {
    if (typeof saved?.showTitles?.[id]==="boolean") state.showTitles[id]=saved.showTitles[id];
    const gaps=saved?.fieldGaps;
    const value=gaps && Object.hasOwn(gaps,id) ? gaps[id] : (id==="phone"?saved?.phoneGap:undefined);
    if (value===null || (Number.isInteger(value) && value>=0 && value<=180)) state.fieldGaps[id]=value;
  }
  for (const [id] of textTargets) {
    const value=saved?.textSizes?.[id];
    if (Number.isInteger(value) && value>=50 && value<=180) state.textSizes[id]=value;
  }
  for (const role of ["shop","info"]) {
    if (validFont(saved?.fonts?.[role])) state.fonts[role]=saved.fonts[role];
  }
  for (const {id} of fields) {
    const pos=saved?.positions?.[id];
    if (Number.isFinite(pos?.x) && Number.isFinite(pos?.y)) state.positions[id]={x:pos.x,y:pos.y};
  }
  if (saved?.language==="en") state.language="en";
  if (Number.isInteger(saved?.qrScale) && saved.qrScale>=65 && saved.qrScale<=120) state.qrScale=saved.qrScale;
  if (Array.isArray(saved?.infoOrder)) {
    const valid=saved.infoOrder.filter(id=>initial.infoOrder.includes(id));
    state.infoOrder=[...new Set([...valid,...initial.infoOrder])];
  }
  for (const key of Object.keys(designSettings)) {
    if (/^#[0-9a-f]{6}$/i.test(saved?.colors?.[key])) state.colors[key] = saved.colors[key];
  }
  for (const field of fields) {
    const value=saved?.fields?.[field.id];
    if (typeof value?.text==="string" && typeof value?.enabled==="boolean") state.fields[field.id]={...value};
  }
}
applySettings(published.state);
try {
  if (!window.openedSharedCard) applySettings(JSON.parse(localStorage.getItem(storageKey)));
} catch { /* Local saving can be unavailable for downloaded files. */ }

const byId = id => document.getElementById(id);
const front = byId("front").getContext("2d");
const back = byId("back").getContext("2d");
const paperInput = byId("paper");
const qrScaleInput = byId("qr-scale");
const status = byId("status");
let pictures = null, paperCache = null;
const qrCache = new Map();
const infoRows = new Map();

function cardLabel(field) {
  return state.language==="en" ? field.english : field.label;
}

function updateInfoOrder() {
  const host=byId("info-controls");
  state.infoOrder.forEach((id,index)=>{
    const {row,up,down}=infoRows.get(id);
    host.append(row);
    up.disabled=index===0;
    down.disabled=index===state.infoOrder.length-1;
  });
}

function moveField(id,direction,button) {
  const order=state.infoOrder;
  const index=order.indexOf(id);
  const next=index+direction;
  if (next<0 || next>=order.length) return;
  const refocus=document.activeElement===button;
  [order[index],order[next]]=[order[next],order[index]];
  updateInfoOrder();
  if (refocus) {
    const {up,down}=infoRows.get(id);
    (button.disabled ? (direction<0?down:up) : button).focus();
  }
  refresh();
}

function updateLanguageControls() {
  for (const button of document.querySelectorAll("[data-language]")) {
    button.setAttribute("aria-pressed",String(button.dataset.language===state.language));
  }
}

function buildInputs() {
  for (const field of fields) {
    const value = state.fields[field.id];
    const row = document.createElement("div");
    row.className = "row";
    const label = document.createElement("label");
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = "show-" + field.id;
    toggle.checked = value.enabled;
    label.append(toggle, field.label);
    toggle.setAttribute("aria-label", field.label + " 표시");
    const input = document.createElement("input");
    input.type = field.type || "text";
    input.id = "value-" + field.id;
    input.setAttribute("aria-label", field.label + " 입력");
    input.placeholder = field.placeholder;
    input.maxLength = field.qr ? 1024 : 180;
    input.disabled = !toggle.checked;
    input.value = value.text;
    toggle.addEventListener("change", () => {
      value.enabled = toggle.checked;
      input.disabled = !value.enabled;
      updateSizeVisibility();
      refresh();
    });
    input.addEventListener("input", () => {
      value.text = input.value;
      refresh();
    });
    row.append(label,input);
    if (field.qr) {
      byId("qr-controls").append(row);
      continue;
    }
    row.classList.add("sortable");
    const controls=document.createElement("div");
    controls.className="order-buttons";
    const [up,down]=[-1,1].map(direction=>{
      const button=document.createElement("button");
      const label=field.label+(direction<0?" 위로":" 아래로");
      button.type="button";
      button.textContent=direction<0?"↑":"↓";
      button.setAttribute("aria-label",label);
      button.title=label;
      button.addEventListener("click",()=>moveField(field.id,direction,button));
      return button;
    });
    controls.append(up,down);
    row.append(controls);
    infoRows.set(field.id,{row,up,down});
  }
  updateInfoOrder();
}

function updateDesignControls() {
  for (const button of document.querySelectorAll("[data-design]")) {
    button.setAttribute("aria-pressed",String(button.dataset.design===state.design));
  }
  paperInput.value = state.colors[state.design];
  byId("hex").value = paperInput.value.toUpperCase();
}

function loadImage(src) {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error("이미지를 읽을 수 없습니다."));
    image.src=src;
  });
}

function context(width,height) {
  const canvas=document.createElement("canvas");
  canvas.width=width;
  canvas.height=height;
  return canvas.getContext("2d");
}

function rgb(hex) {
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
}

function paper(skin,color) {
  const key=skin+color;
  if (paperCache?.key===key) return paperCache.canvas;
  const layer = context(W,H);
  layer.fillStyle=layer.createPattern(pictures[skin].grain,"repeat");
  layer.fillRect(0,0,W,H);
  const texture=layer.getImageData(0,0,W,H), px=texture.data;
  const [red,green,blue]=rgb(color);
  for (let i=0;i<px.length;i+=4) {
    const detail=px[i]-128;
    px[i]=red+detail;
    px[i+1]=green+detail;
    px[i+2]=blue+detail;
  }
  layer.putImageData(texture,0,0);
  paperCache={key,canvas:layer.canvas};
  return layer.canvas;
}

function colors(color) {
  const srgb=rgb(color).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const luminance=.2126*srgb[0]+.7152*srgb[1]+.0722*srgb[2];
  const light=luminance>.23;
  const style=designSettings[state.design];
  const tintedAccent = light ? style.darkAccent : (luminance>.135 ? "#ffe6bf" : style.accent);
  return {primary:light?"#1c1b17":"#f6ead5", accent:tintedAccent};
}

function lineWrap(ctx,text,width) {
  const lines=[];
  for (const paragraph of text.split(/\r?\n/)) {
    let line="";
    for (const run of paragraph.match(/\s+|\S+/gu) || []) {
      if (line && /\S/u.test(run) && ctx.measureText(line+run).width>width) {
        lines.push(line);
        line="";
      }
      for (const char of run) {
        if (line && ctx.measureText(line+char).width>width) {
          lines.push(line);
          line="";
        }
        line+=char;
      }
    }
    if(line) lines.push(line);
  }
  return lines;
}

function infoRowsAtScale(items,factor,custom) {
  const rows=items.map(field=>{
    const value=state.fields[field.id].text;
    const hero=field.id==="shop" || field.id==="name";
    const base=Math.round(field.size*factor);
    const scale=custom ? state.textSizes[field.id]/100 : 1;
    const labelScale=custom ? state.textSizes[field.id+"-label"]/100 : 1;
    const size=Math.round((field.id==="shop"?base:Math.round(base*1.18))*scale);
    const labelSize=Math.round(Math.max(19,Math.round(base*.96))*labelScale);
    const font=`400 ${size}px ${fontStack(field.id==="shop"?"shop":"info")}`;
    const explicitGap=state.fieldGaps[field.id];
    const showTitle=state.showTitles[field.id];
    back.font=`400 ${labelSize}px ${fontStack("info")}`;
    const titleWidth=Math.min(159,Math.ceil(back.measureText(cardLabel(field)).width));
    const titleGap=explicitGap ?? 0;
    const x=96+(showTitle?titleWidth:0)+titleGap;
    back.font=font;
    const placeholder=state.language==="en" ? (field.englishPlaceholder || field.english) : field.placeholder;
    const lines=lineWrap(back,value||placeholder,(hero?W-96:703)-x);
    const step=Math.ceil(base*1.23*scale);
    const height=Math.max(lines.length*step,showTitle?labelSize+3:0);
    return {field,showTitle,titleGap,labelSize,x,font,lines,step,height,gap:Math.round(16*factor)};
  });
  const height=rows.reduce((sum,row)=>sum+row.height+row.gap,0)-(rows.at(-1)?.gap||0);
  return {rows,height};
}

function infoLayout(items) {
  // Choose the default fit first, so increasing one field never shrinks its neighbours.
  let factor=1;
  while (factor>.4 && infoRowsAtScale(items,factor,false).height>514) {
    factor=Math.max(.4,Math.round((factor-.05)*100)/100);
  }
  return infoRowsAtScale(items,factor,true);
}

function drawInfo(items,theme) {
  if (!items.length) return true;
  const {rows,height}=infoLayout(items);
  let y=height>514?73:(H-height)/2;
  back.textAlign="left";
  back.textBaseline="top";
  for (const row of rows) {
    back.font=row.font;
    const width=row.x-96+Math.ceil(Math.max(1,...row.lines.map(line=>back.measureText(line).width)));
    back.save();
    placeItem(row.field.id,96,y,width+4,row.height+4);
    byId(row.field.id+"-gap").value=row.titleGap;
    byId(row.field.id+"-gap-value").value=row.titleGap+" px";
    if(row.showTitle){
      back.fillStyle=state.inks.label ?? theme.accent;
      back.font=`400 ${row.labelSize}px ${fontStack("info")}`;
      back.fillText(cardLabel(row.field),96,y+2,159);
    }
    back.font=row.font;
    back.fillStyle=row.field.id==="shop"?state.inks.shop:state.inks.value;
    row.lines.forEach((line,i)=>back.fillText(line,row.x,y+i*row.step));
    back.restore();
    y+=row.height+row.gap;
  }
  return height<=514;
}

function linkFor(field) {
  let value=state.fields[field.id].text.trim();
  if(!value) return null;
  if(field.id==="instagram" && /^@?[A-Za-z0-9._]{1,30}$/.test(value)) {
    return "https://www.instagram.com/"+value.replace(/^@/,"")+"/";
  }
  if(!/^[a-z][a-z0-9+.-]*:/i.test(value)) value="https://"+value;
  const url=new URL(value);
  if (!/^https?:$/.test(url.protocol)||!url.hostname.includes(".")||url.username||url.password) throw Error();
  if (field.id==="instagram" && !["instagram.com","www.instagram.com"].includes(url.hostname)) throw Error();
  return url.href;
}

function qrMatrix(url) {
  if(!qrCache.has(url)) {
    const code=qrcode(0,"M");
    code.addData(url,"Byte");
    code.make();
    if(qrCache.size>=16) qrCache.delete(qrCache.keys().next().value);
    qrCache.set(url,code);
  }
  return qrCache.get(url);
}

function drawQRs(items,theme) {
  const errors=[];
  const size=Math.round((items.length===2?176:220)*state.qrScale/100);
  const gap=35;
  const labelSize=field=>Math.round(30*state.textSizes[field.id]/100);
  const heights=items.map(f=>size+labelSize(f)+14);
  const total=heights.reduce((a,b)=>a+b,0)+Math.max(0,items.length-1)*gap;
  let next=(H-total)/2;
  const ys=items.map((field,i)=>{
    const h=heights[i], auto=next;
    next+=h+gap;
    const stops={auto,top:46,middle:(H-h)/2,bottom:H-80-h};
    return Math.round(stops[state.docks[field.id]]);
  });
  if (ys.length===2) {
    const first=ys[0]<=ys[1]?0:1, last=1-first;
    if (ys[first]+heights[first]+12>ys[last]) {
      const free=H-heights[first]-heights[last]-12;
      const topMargin=Math.min(46,free/3), bottomMargin=Math.min(80,free-topMargin);
      const ideal=(ys[first]+ys[last]-heights[first]-12)/2;
      ys[first]=topMargin+clamp(ideal-topMargin,free-topMargin-bottomMargin);
      ys[last]=ys[first]+heights[first]+12;
    }
  }
  const centre=922;
  const x=Math.round(centre-size/2);
  for (const [index,field] of items.entries()) {
    const y=Math.round(ys[index]);
    back.save();
    back.font=`400 ${labelSize(field)}px ${fontStack("info")}`;
    const labelHeight=labelSize(field)+7;
    const maxWidth=dividedLayout?W-dividerX-12:W;
    const width=Math.min(maxWidth,Math.max(size,Math.ceil(back.measureText("< "+cardLabel(field)+" >").width)));
    placeItem(field.id,Math.round(centre-width/2),y,width,size+labelHeight+7);
    let code=null,error=false;
    const input=byId("value-"+field.id);
    try {
      const url=linkFor(field);
      if(url) code=qrMatrix(url);
    } catch {
      code=null;
      error=true;
      errors.push(field.label+" URL을 확인해 주세요.");
    }
    if(code && code.getModuleCount()+8>size/2) {
      code=null;
      error=true;
      errors.push(field.label+" QR 크기를 늘려 주세요.");
    }
    input.setAttribute("aria-invalid",String(error));
    const count=code ? code.getModuleCount() : 0;
    const moduleSize=Math.floor(size/(count+8));
    const side=code ? (count+8)*moduleSize : size;
    const inset=Math.floor((size-side)/2);
    const plateX=x+inset, plateY=y+inset;
    back.fillStyle="#fff8ea";
    back.fillRect(plateX,plateY,side,side);
    if(code) {

      back.fillStyle="#000";
      for(let row=0;row<count;row++) {
        for(let col=0;col<count;col++) {
          if(code.isDark(row,col)) back.fillRect(plateX+(col+4)*moduleSize,plateY+(row+4)*moduleSize,moduleSize,moduleSize);
        }
      }
    } else {
      back.fillStyle="#32302b";
      back.font="400 24px "+fontStack("info");
      back.textAlign="center";
      back.textBaseline="middle";
      back.fillText(state.language==="en"?"Enter QR URL":"QR 주소 입력",centre,y+size/2);
    }
    back.fillStyle=theme.accent;
    back.font=`400 ${labelSize(field)}px ${fontStack("info")}`;
    back.textAlign="center";
    back.textBaseline="top";
    back.fillText("< "+cardLabel(field)+" >",centre,plateY+side+8,width);
    back.restore();

  }
  return errors;
}

function drawServices(theme) {
  const words=state.language==="en"?"Repair · Custom · Tuning · Rental":"정비 · 커스텀 · 튜닝 · 렌탈";
  const centre=W/2, baseline=608;
  back.save();
  back.font=`400 ${Math.round(34*state.textSizes.services/100)}px ${fontStack("info")}`;
  back.textAlign="center";
  back.textBaseline="middle";
  const half=back.measureText(words).width/2;
  back.fillStyle=theme.accent;
  back.fillText(words,centre,baseline);
  back.globalAlpha=.68;
  for(const direction of [-1,1]){
    const inner=centre+direction*(half+25);
    const outer=inner+direction*105;
    const fade=back.createLinearGradient(outer,0,inner,0);
    fade.addColorStop(0,theme.accent+"19");
    fade.addColorStop(1,theme.accent);
    back.fillStyle=fade;
    back.fillRect(Math.min(inner,outer),baseline,105,1.5);
  }
  back.restore();
}

function refresh() {
  try { localStorage.setItem(storageKey,JSON.stringify(state)); } catch { /* optional */ }
  if (!pictures) return;
  const color=state.colors[state.design];
  const base=paper(state.design,color);
  front.drawImage(base,0,0);
  const scale=state.logoScale/100;
  front.drawImage(pictures[state.design].art,W*(1-scale)/2,H*(1-scale)/2,W*scale,H*scale);
  back.drawImage(base,0,0);
  const theme=colors(color);
  byId("ink-label").value=state.inks.label ?? theme.accent;
  for (const role of ["shop","info"]) byId("sample-"+role).style.fontFamily=fontStack(role);
  const info=state.infoOrder.filter(id=>state.fields[id].enabled).map(id=>fieldById[id]);
  const links=fields.filter(f=>f.qr&&state.fields[f.id].enabled);
  const contacts=contactFields.filter(f=>state.fields[f.id].enabled);
  dividedLayout=Boolean(contacts.length && links.length);
  for(const f of fields.filter(f=>f.qr)) byId("value-"+f.id).setAttribute("aria-invalid","false");
  hitBoxes.clear();
  const notes=drawQRs(links,theme);
  if(!drawInfo(info,theme)) notes.push("왼쪽 정보가 길어요. 내용을 줄이면 명함 안에 모두 들어갑니다.");
  drawServices(theme);
  if (dividedLayout) {
    back.save();
    back.globalAlpha=.72;
    back.fillStyle=theme.accent;
    const length=Math.min(477,contacts.reduce((sum,f)=>sum+hitBoxes.get(f.id).height,0)+Math.max(0,contacts.length-1)*8);
    back.fillRect(dividerX,556-length,4,length);
    back.restore();
  }
  if(links.some(f=>!state.fields[f.id].text.trim())) notes.push("주소를 입력한 QR만 스캔할 수 있습니다.");
  syncNumericControls();
  byId("center-shop").disabled=!state.fields.shop.enabled;
  for (const id of Object.keys(state.docks)) {
    const control=byId("dock-"+id);
    control.disabled=!state.fields[id].enabled;
    control.value=state.positions[id]?"manual":state.docks[id];
  }
  status.textContent=notes.join(" ");
}

function withPrintDensity(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const phys=new Uint8Array([0,0,0,9,112,72,89,115,0,0,46,35,0,0,46,35,1,0,0,0,0]);
  let crc=-1;
  for(let i=4;i<17;i++){
    crc^=phys[i];
    for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  new DataView(phys.buffer).setUint32(17,(crc^-1)>>>0);
  const parts=[bytes.subarray(0,8)];
  for(let offset=8;offset<bytes.length;){
    const size=view.getUint32(offset);
    const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
    if(type!=="pHYs") parts.push(bytes.subarray(offset,offset+12+size));
    if(type==="IHDR") parts.push(phys);
    offset+=12+size;
  }
  return new Blob(parts,{type:"image/png"});
}

function download(blob,name) {
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function save(side) {
  byId(side).toBlob(async blob=>{
    if(!blob){status.textContent="PNG를 저장하지 못했습니다.";return;}
    const file=withPrintDensity(new Uint8Array(await blob.arrayBuffer()));
    download(file,`golden-hour-${state.design}-${side}.png`);
  },"image/png");
}

async function savePublishedEditor() {
  const copy=document.documentElement.cloneNode(true);
  copy.classList.remove("editor-ready");
  for (const el of copy.querySelectorAll(".number-unit")) el.remove();
  for (const id of ["info-controls","qr-controls","info-font","shop-font","item-sizes","field-gaps","status"]) {
    copy.querySelector("#"+id).replaceChildren();
  }
  copy.querySelector("#back").classList.remove("dragging");
  for (const button of copy.querySelectorAll(".editor-actions button,[data-save]")) button.disabled=true;
  const seed=JSON.stringify({version:Date.now().toString(36),state}).replace(/</g,"\\u003c");
  copy.querySelector("#published-settings").textContent=seed;
  const button=byId("publish-html");
  button.disabled=true;
  try {
    const html=window.embedPageResources ? await window.embedPageResources(copy) : "<!doctype html>\n"+copy.outerHTML;
    download(new Blob([html],{type:"text/html;charset=utf-8"}),"index.html");
  } catch {
    status.textContent="편집기 파일을 저장하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.";
  } finally {
    button.disabled=false;
  }
}

function saveShareHTML() {
  const figures=[["front","앞면"],["back","뒷면"]].map(([side,label])=>{
    const image=byId(side).toDataURL("image/jpeg",.96);
    return `<figure><figcaption>${label}</figcaption><img src="${image}" alt="Golden Hour Garage 명함 ${label}" width="${W}" height="${H}"></figure>`;
  });
  const markup=shareTemplate.replace("__SHARE_CONTENT__",'<div class="pair">'+figures.join("")+'</div>');
  download(new Blob([markup],{type:"text/html;charset=utf-8"}),"golden-hour-garage-share.html");
}

function saveShareImage() {
  const margin=24, caption=43;
  const sheet=context(W+margin*2,2*(H+caption)+margin*3);
  sheet.fillStyle="#181611";
  sheet.fillRect(0,0,sheet.canvas.width,sheet.canvas.height);
  sheet.font="400 27px CardSans, sans-serif";
  sheet.fillStyle="#f5e9d5";
  sheet.textBaseline="top";
  [["front","앞면"],["back","뒷면"]].forEach(([side,label],i)=>{
    const y=margin+i*(caption+H+margin);
    sheet.fillText(label,margin,y);
    sheet.drawImage(byId(side),margin,y+caption);
  });
  sheet.canvas.toBlob(blob=>{
    if(blob) download(blob,"golden-hour-garage-share.png");
    else status.textContent="공유 이미지를 저장하지 못했습니다.";
  },"image/png");
}

const dividerX=752;
let dividedLayout=false;
const hitBoxes=new Map();
const canvas=back.canvas;

function clamp(value,max) {
  return Math.max(0,Math.min(value,max));
}

function placeItem(id,x,y,width,height) {
  const manual=state.positions[id];
  let minX=0, maxX=W-width;
  if (dividedLayout) {
    if (fieldById[id].qr) minX=dividerX+12;
    else if (contactFields.includes(fieldById[id])) maxX=dividerX-8-width;
  }
  const left=minX+clamp((manual?.x ?? x)-minX,maxX-minX);
  const top=manual ? clamp(manual.y,H-height) : y;
  hitBoxes.set(id,{x:left,y:top,width,height});
  back.translate(Math.round(left-x),Math.round(top-y));
}

async function loadFamily(slug) {
  const korean=fontCatalog.some(f=>f.slug===slug && f.group==="한글 추천 10종");
  if (korean && window.loadHostedKorean) await window.loadHostedKorean(slug);
  const faces=await document.fonts.load('400 32px "'+slug+'"','골든아워 개러지 김동권 010 Golden Hour');
  if (!faces.length) throw new Error("서체 로딩 실패");
  return faces;
}

for (const role of ["shop","info"]) {
  const select=byId(role+"-font");
  const groups=new Map();
  for (const family of families) {
    if (!groups.has(family.group)) {
      const group=document.createElement("optgroup");
      group.label=family.group;
      select.append(group);
      groups.set(family.group,group);
    }
    groups.get(family.group).append(new Option(family.name,family.slug));
  }
  select.value=state.fonts[role];
  select.addEventListener("change",async ()=>{
    const selected=select.value;
    try {
      await loadFamily(selected);
      if (select.value!==selected) return;
      state.fonts[role]=selected;
      refresh();
    } catch {
      select.value=state.fonts[role];
      status.textContent="선택한 글씨체를 불러오지 못했습니다.";
    }
  });
}

function cardPoint(event) {
  const rect=canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*W/rect.width,y:(event.clientY-rect.top)*H/rect.height};
}

const guideCtx=byId("align-guides").getContext("2d");

function snapAxis(axis,point,box,peers) {
  const horizontal=axis==="x";
  const dim=horizontal?"width":"height";
  const cross=horizontal?"y":"x", otherDim=horizontal?"height":"width";
  const limit=horizontal?W:H, raw=point[axis], size=box[dim];
  const tolerance=Math.min(12,4*W/canvas.getBoundingClientRect().width);
  let best={value:raw}, distance=tolerance;
  function consider(value,guide) {
    const delta=Math.abs(value-raw);
    if (value>=0 && value+size<=limit && delta<=distance) {
      best={value,...guide}; distance=delta;
    }
  }
  for (const peer of peers) {
    for (const fraction of [0,.5,1]) {
      const at=peer[axis]+peer[dim]*fraction;
      consider(at-size*fraction,{at});
    }
  }
  consider((limit-size)/2,{at:limit/2});
  // Equal spacing is meaningful among neighbours occupying the same row or column.
  const neighbours=peers.filter(p=>p[cross]<point[cross]+box[otherDim] && p[cross]+p[otherDim]>point[cross])
    .sort((a,b)=>a[axis]-b[axis]);
  const track=point[cross]+box[otherDim]/2;
  for (let i=1;i<neighbours.length;i++) {
    const a=neighbours[i-1],b=neighbours[i];
    const endA=a[axis]+a[dim],startB=b[axis],endB=startB+b[dim];
    const gap=startB-endA;
    if (gap<1) continue;
    consider(endB+gap,{track,spans:[[endA,startB],[endB,endB+gap]]});
    consider(a[axis]-gap-size,{track,spans:[[a[axis]-gap,a[axis]],[endA,startB]]});
    const half=(gap-size)/2;
    if (half>=1) consider(endA+half,{track,spans:[[endA,endA+half],[startB-half,startB]]});
  }
  return best;
}

function paintGuide(axis,guide) {
  const g=guideCtx;
  g.save();
  g.strokeStyle="#67e6df"; g.lineWidth=2;
  function segment(x1,y1,x2,y2) {
    g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
  }
  if (guide.at!==undefined) {
    g.setLineDash([8,5]);
    if (axis==="x") segment(guide.at,0,guide.at,H);
    else segment(0,guide.at,W,guide.at);
  }
  if (guide.spans) {
    const track=guide.track;
    g.strokeStyle="#ff94cd";g.fillStyle="#fff";g.font="bold 18px sans-serif";
    for (const [start,end] of guide.spans) {
      const mid=(start+end)/2;
      if (axis==="x") {
        segment(start,track,end,track);
        for (const x of [start,end]) segment(x,track-6,x,track+6);
      } else {
        segment(track,start,track,end);
        for (const y of [start,end]) segment(track-6,y,track+6,y);
      }
      const x=axis==="x"?mid:track+8,y=axis==="x"?track-8:mid;
      const label=Math.round(end-start)+" px";
      g.fillStyle="#302130";g.fillRect(x-2,y-17,g.measureText(label).width+5,21);
      g.fillStyle="white";g.fillText(label,x,y);
    }
  }
  g.restore();
}

let hold=null;
function endHold() {
  if (!hold) return;
  const pointer=hold.pointer;
  clearTimeout(hold.timer);
  const moved=hold.active;
  hold=null;
  if (moved) refresh();
  canvas.classList.remove("dragging");
  guideCtx.clearRect(0,0,W,H);
  if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
}
canvas.addEventListener("pointerdown",event=>{
  if (hold || event.button!==0) return;
  const point=cardPoint(event);
  const target=[...hitBoxes.entries()].reverse().find(([,b])=>
    point.x>=b.x-3 && point.x<=b.x+b.width+3 && point.y>=b.y-3 && point.y<=b.y+b.height+3);
  if (!target) return;
  const [id,box]=target;
  hold={id,pointer:event.pointerId,box,point,clientX:event.clientX,clientY:event.clientY,active:false};
  canvas.setPointerCapture(event.pointerId);
  hold.timer=setTimeout(()=>{
    hold.active=true;
    canvas.classList.add("dragging");
  },320);
});
canvas.addEventListener("pointermove",event=>{
  if (event.pointerId!==hold?.pointer) return;
  if (!hold.active) {
    if (Math.hypot(event.clientX-hold.clientX,event.clientY-hold.clientY)>8) endHold();
    return;
  }
  const point=cardPoint(event), box=hold.box;
  const proposed={x:box.x+point.x-hold.point.x,y:box.y+point.y-hold.point.y};
  const peers=[...hitBoxes.entries()].filter(([id])=>id!==hold.id).map(([,b])=>b);
  const snapX=snapAxis("x",proposed,box,peers);
  const snapY=snapAxis("y",proposed,box,peers);
  state.positions[hold.id]={x:Math.round(snapX.value),y:Math.round(snapY.value)};
  refresh();
  const actual=hitBoxes.get(hold.id);
  state.positions[hold.id]={x:actual.x,y:actual.y};
  guideCtx.clearRect(0,0,W,H);
  if (Math.abs(actual.x-snapX.value)<1) paintGuide("x",snapX);
  if (Math.abs(actual.y-snapY.value)<1) paintGuide("y",snapY);
});
for (const type of ["pointerup","pointercancel","lostpointercapture"]) {
  canvas.addEventListener(type,event=>{if (event.pointerId===hold?.pointer) endHold();});
}
canvas.addEventListener("contextmenu",event=>event.preventDefault());
byId("reset-positions").addEventListener("click",()=>{
  endHold();
  state.positions={};
  state.docks={...initial.docks};
  refresh();
});

for (const role of Object.keys(state.inks)) {
  const control=byId("ink-"+role);
  control.value=state.inks[role] ?? colors(state.colors[state.design]).accent;
  control.addEventListener("input",()=>{state.inks[role]=control.value;refresh();});
}
for (const id of Object.keys(state.docks)) {
  const control=byId("dock-"+id);
  control.addEventListener("change",()=>{
    state.docks[id]=control.value;
    delete state.positions[id];
    refresh();
  });
}
byId("center-shop").addEventListener("click",()=>{
  const box=hitBoxes.get("shop");
  if (box) {state.positions.shop={x:(W-box.width)/2,y:box.y};refresh();}
});

function updateSizeVisibility() {
  for (const row of document.querySelectorAll("#item-sizes > div, #field-gaps > div")) {
    const id=row.dataset.owner;
    const hiddenTitle=row.dataset.title==="true" && !state.showTitles[id];
    row.hidden=state.fields[id]?.enabled===false || hiddenTitle;
  }
}

for (const [id,title] of textTargets) {
  const row=document.createElement("div");
  row.className="qr-scale";
  row.dataset.owner=id.replace(/-label$/,"");
  row.dataset.title=String(id.endsWith("-label"));
  const input=document.createElement("input");
  input.type="range";
  input.id="size-"+id;
  input.min=50;
  input.max=180;
  input.value=state.textSizes[id];
  const label=document.createElement("label");
  label.htmlFor=input.id;
  label.textContent=contactFields.some(f=>f.id===id)?title+" 값":title;
  const output=document.createElement("output");
  output.htmlFor.add(input.id);
  output.value=input.value+"%";
  function updateSize() {
    state.textSizes[id]=Number(input.value);
    output.value=input.value+"%";
    refresh();
  }
  input.addEventListener("input",updateSize);
  const reset=document.createElement("button");
  reset.type="button";
  reset.textContent="기본";
  reset.setAttribute("aria-label",label.textContent+" 기본 크기");
  reset.addEventListener("click",()=>{input.value=100;updateSize();});
  row.append(label,input,output,reset);
  byId("item-sizes").append(row);
}
for (const field of infoFields) {
  const row=document.createElement("div");
  row.className="qr-scale";
  row.dataset.owner=field.id;
  const input=document.createElement("input");
  input.type="range";
  input.id=field.id+"-gap";
  input.min=0;
  input.max=180;
  const label=document.createElement("label");
  label.htmlFor=input.id;
  label.textContent=field.label;
  const output=document.createElement("output");
  output.id=input.id+"-value";
  output.htmlFor.add(input.id);
  const reset=document.createElement("button");
  reset.type="button";
  reset.textContent="기본";
  reset.setAttribute("aria-label",field.label+" "+reset.textContent);
  function applyGap(value) {
    state.fieldGaps[field.id]=value;
    updateSizeVisibility();
    refresh();
  }
  input.addEventListener("input",()=>applyGap(Number(input.value)));
  reset.addEventListener("click",()=>applyGap(null));
  row.append(label,input,output,reset);
  const titleSwitch=document.createElement("label");
  titleSwitch.className="title-switch";
  const toggle=document.createElement("input");
  toggle.type="checkbox"; toggle.checked=state.showTitles[field.id];
  toggle.setAttribute("aria-label",field.label+" 제목 표시");
  toggle.addEventListener("change",()=>{
    state.showTitles[field.id]=toggle.checked;
    updateSizeVisibility();
    refresh();
  });
  titleSwitch.append(toggle,"제목 표시");
  row.append(titleSwitch);
  byId("field-gaps").append(row);
}
updateSizeVisibility();
byId("logo-size").value=state.logoScale;
byId("logo-size-value").value=state.logoScale+"%";
byId("logo-size").addEventListener("input",event=>{
  state.logoScale=Number(event.target.value);
  byId("logo-size-value").value=state.logoScale+"%";
  refresh();
});
buildInputs();
updateDesignControls();
updateLanguageControls();
qrScaleInput.value=state.qrScale;
byId("qr-scale-value").value=state.qrScale+"%";
qrScaleInput.addEventListener("input",()=>{
  state.qrScale=Number(qrScaleInput.value);
  byId("qr-scale-value").value=state.qrScale+"%";
  refresh();
});
byId("accent-default").addEventListener("click",()=>{state.inks.label=null;refresh();});
const numericPairs=[];
for (const slider of document.querySelectorAll('input[type="range"]')) {
  const row=slider.closest(".qr-scale");
  const output=row.querySelector("output");
  output.hidden=true;
  const wrapper=document.createElement("span");
  wrapper.className="number-unit";
  const number=document.createElement("input");
  number.type="number";number.inputMode="numeric";number.id=slider.id+"-number";
  number.min=slider.min;number.max=slider.max;number.step=slider.step||"1";
  number.setAttribute("aria-label",row.querySelector("label").textContent+" 숫자 입력");
  wrapper.append(number,slider.id.endsWith("-gap")?"px":"%");
  output.after(wrapper);
  function commit(final) {
    const v=number.valueAsNumber;
    if (Number.isFinite(v) && (final || number.validity.valid)) {
      slider.value=String(Math.round(v));
      slider.dispatchEvent(new Event("input"));
    }
    if (final) number.value=slider.value;
  }
  number.addEventListener("input",()=>commit(false));
  number.addEventListener("blur",()=>commit(true));
  number.addEventListener("keydown",e=>{if(e.key==="Enter")number.blur();});
  numericPairs.push({slider,number});
}

const positionTarget=byId("position-target");
positionTarget.replaceChildren(...fields.map(f=>new Option(f.label,f.id)));
function syncNumericControls() {
  for (const {slider,number} of numericPairs) {
    if (document.activeElement!==number) number.value=slider.value;
  }
  for (const option of positionTarget.options) option.disabled=!hitBoxes.has(option.value);
  if (!hitBoxes.has(positionTarget.value)) positionTarget.value=fields.find(f=>hitBoxes.has(f.id))?.id || "";
  const box=hitBoxes.get(positionTarget.value);
  for (const axis of ["x","y"]) {
    const input=byId("position-"+axis);
    input.disabled=!box;
    if (document.activeElement!==input) input.value=box?Math.round(box[axis]):"";
  }
}
positionTarget.addEventListener("change",syncNumericControls);
for (const axis of ["x","y"]) {
  const input=byId("position-"+axis);
  input.addEventListener("input",()=>{
    const id=positionTarget.value, box=hitBoxes.get(id);
    if (!box || !Number.isSafeInteger(input.valueAsNumber)) return;
    state.positions[id]={x:box.x,y:box.y,[axis]:input.valueAsNumber};
    refresh();
    const placed=hitBoxes.get(id);
    state.positions[id]={x:placed.x,y:placed.y};
  });
  input.addEventListener("blur",()=>{const box=hitBoxes.get(positionTarget.value);if(box)input.value=Math.round(box[axis]);refresh();});
  input.addEventListener("keydown",e=>{if(e.key==="Enter")input.blur();});
}
for(const button of document.querySelectorAll("[data-language]")) {
  button.addEventListener("click",()=>{
    state.language=button.dataset.language;
    updateLanguageControls();
    refresh();
  });
}
for(const button of document.querySelectorAll("[data-design]")) {
  button.addEventListener("click",()=>{
    state.design=button.dataset.design;
    updateDesignControls();
    refresh();
  });
}
paperInput.addEventListener("input",()=>{
  state.colors[state.design]=paperInput.value;
  updateDesignControls();
  refresh();
});
byId("reset").addEventListener("click",()=>{
  state.colors[state.design]=designSettings[state.design].paper;
  updateDesignControls();
  refresh();
});
byId("print").addEventListener("click",()=>window.print());
byId("publish-html").addEventListener("click",savePublishedEditor);
byId("share-html").addEventListener("click",saveShareHTML);
byId("share-image").addEventListener("click",saveShareImage);
for(const button of document.querySelectorAll("[data-save]")) {
  button.addEventListener("click",()=>save(button.dataset.save));
}
const cardFonts=Promise.all([
  ...Object.values(state.fonts).map(loadFamily),
  document.fonts?.load("400 34px CardSans","대표 골든아워"),
  document.fonts?.load("400 46px CardSatisfy","Golden Hour Garage"),
  document.fonts?.load("400 34px CardBrush","김태양 010-0000-0000"),
].map(load=>Promise.resolve(load).catch(()=>{})));
cardFonts.then(()=>{ if(pictures) refresh(); });
Promise.all([
  Promise.race([cardFonts,new Promise(resolve=>setTimeout(resolve,1500))]),
  Promise.all(Object.entries(cardMedia).map(async ([key,files])=>[
    key,{art:await loadImage(files.art),grain:await loadImage(files.grain)},
  ])),
]).then(([,images])=>{
  pictures=Object.fromEntries(images);
  refresh();
  document.documentElement.classList.add("editor-ready");
  for(const button of document.querySelectorAll(".editor-actions button,[data-save]")) button.disabled=false;
}).catch(()=>{
  byId("startup-note").textContent="이 환경에서는 편집 화면을 열 수 없습니다. 아래에서 기본 앞뒷면을 확인할 수 있습니다.";
});
