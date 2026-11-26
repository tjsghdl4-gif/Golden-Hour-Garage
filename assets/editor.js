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
const initial = {
  design:"engraved",
  language:"ko",
  qrScale:100,
  fonts:{shop:"CardSatisfy",info:"CardBrush"},
  positions:{},
  infoOrder:fields.filter(field=>!field.qr).map(field=>field.id),
  colors:Object.fromEntries(Object.entries(designSettings).map(([key,value])=>[key,value.paper])),
  fields:Object.fromEntries(fields.map(field=>[field.id,{enabled:field.initial,text:""}])),
};
const state = JSON.parse(JSON.stringify(initial));
const published=JSON.parse(document.getElementById("published-settings").textContent);
const storageKey = "golden-hour-garage-editor-v1"+(published.version ? "-"+published.version : "");
function applySettings(saved) {
  if (saved && Object.prototype.hasOwnProperty.call(designSettings,saved.design)) state.design = saved.design;
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
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next=line?line+" "+word:word;
      if(ctx.measureText(next).width<=width) {
        line=next;
        continue;
      }
      if(line) lines.push(line);
      line="";
      for(const char of word) {
        if(line && ctx.measureText(line+char).width>width) {
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

function infoLayout(items) {
  let rows, height;
  for (let factor=1;factor>=.4;factor-=.05) {
    rows=items.map(field=>{
      const value=state.fields[field.id].text.trim();
      const hero=field.id==="shop"||field.id==="name";
      const size=Math.round(field.size*factor);
      const x=hero?96:267;
      const sizeOnCard=field.id==="shop"?size:Math.round(size*1.18);
      const font=`400 ${sizeOnCard}px ${fontStack(field.id==="shop"?"shop":"info")}`;
      back.font=font;
      const placeholder=state.language==="en" ? (field.englishPlaceholder || field.english) : field.placeholder;
      const lines=lineWrap(back,value||placeholder,703-x);
      const step=Math.ceil(size*1.23);
      return {field,hero,size,x,font,lines,step,height:lines.length*step,gap:Math.round(16*factor)};
    });
    height=rows.reduce((sum,row)=>sum+row.height+row.gap,0)-(rows[rows.length-1]?.gap||0);
    if(height<=514) break;
  }
  return {rows,height};
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
    if(!row.hero){
      back.fillStyle=theme.accent;
      back.font=`400 ${Math.max(19,Math.round(row.size*.96))}px ${fontStack("info")}`;
      back.fillText(cardLabel(row.field),96,y+2,159);
    }
    back.font=row.font;
    back.fillStyle=theme.primary;
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
  const labelHeight=37, gap=35;
  const height=items.length*(size+labelHeight)+Math.max(0,items.length-1)*gap;
  let y=Math.round((H-height)/2);
  const centre=922;
  const x=Math.round(centre-size/2);
  for(const field of items) {
    back.save();
    back.font="400 30px "+fontStack("info");
    const width=Math.max(size,Math.ceil(back.measureText("< "+cardLabel(field)+" >").width));
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
    back.fillStyle="#fff";
    back.fillRect(x,y,size,size);
    if(code) {
      const count=code.getModuleCount();
      const block=Math.floor(size/(count+8));
      const margin=Math.floor((size-count*block)/2);
      back.fillStyle="#000";
      for(let row=0;row<count;row++) {
        for(let col=0;col<count;col++) {
          if(code.isDark(row,col)) back.fillRect(x+margin+col*block,y+margin+row*block,block,block);
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
    back.font="400 30px "+fontStack("info");
    back.textAlign="center";
    back.textBaseline="top";
    back.fillText("< "+cardLabel(field)+" >",centre,y+size+8);
    back.restore();
    y+=size+labelHeight+gap;
  }
  return errors;
}

function drawServices(theme) {
  const words=state.language==="en"?"Repair · Custom · Tuning · Rental":"정비 · 커스텀 · 튜닝 · 렌탈";
  const centre=W/2, baseline=608;
  back.save();
  back.font="400 34px "+fontStack("info");
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
  front.drawImage(pictures[state.design].art,0,0);
  back.drawImage(base,0,0);
  const theme=colors(color);
  const info=state.infoOrder.filter(id=>state.fields[id].enabled).map(id=>fieldById[id]);
  const links=fields.filter(f=>f.qr&&state.fields[f.id].enabled);
  if (info.length && links.length && !Object.keys(state.positions).length) {
    back.save();
    back.globalAlpha=.35;
    back.fillStyle=theme.accent;
    back.fillRect(752,105,2,451);
    back.restore();
  }
  for(const f of fields.filter(f=>f.qr)) byId("value-"+f.id).setAttribute("aria-invalid","false");
  hitBoxes.clear();
  const notes=drawQRs(links,theme);
  if(!drawInfo(info,theme)) notes.push("왼쪽 정보가 길어요. 내용을 줄이면 명함 안에 모두 들어갑니다.");
  drawServices(theme);
  if(links.some(f=>!state.fields[f.id].text.trim())) notes.push("주소를 입력한 QR만 스캔할 수 있습니다.");
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
  for (const id of ["info-controls","qr-controls","info-font","shop-font","status"]) {
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

const hitBoxes=new Map();
const canvas=back.canvas;

function clamp(value,max) {
  return Math.max(0,Math.min(value,max));
}

function placeItem(id,x,y,width,height) {
  const manual=state.positions[id];
  const left=manual ? clamp(manual.x,W-width) : x;
  const top=manual ? clamp(manual.y,H-height) : y;
  hitBoxes.set(id,{x:left,y:top,width,height});
  back.translate(Math.round(left-x),Math.round(top-y));
}

function loadFamily(slug) {
  return document.fonts.load('400 32px '+slug,'Golden Hour 대표');
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

let hold=null;
function endHold() {
  if (!hold) return;
  const pointer=hold.pointer;
  clearTimeout(hold.timer);
  hold=null;
  canvas.classList.remove("dragging");
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
  state.positions[hold.id]={
    x:Math.round(clamp(box.x+point.x-hold.point.x,W-box.width)),
    y:Math.round(clamp(box.y+point.y-hold.point.y,H-box.height))
  };
  refresh();
});
for (const type of ["pointerup","pointercancel","lostpointercapture"]) {
  canvas.addEventListener(type,event=>{if (event.pointerId===hold?.pointer) endHold();});
}
canvas.addEventListener("contextmenu",event=>event.preventDefault());
byId("reset-positions").addEventListener("click",()=>{
  endHold();
  state.positions={};
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
