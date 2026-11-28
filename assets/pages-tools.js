/* GitHub Pages additions. The exported offline editor needs only its own file. */
const pageSharing = document.getElementById("page-sharing");
const shareLink = document.getElementById("card-url");
const seedElement = document.getElementById("published-settings");
const pageAddress = new URL(document.baseURI);
const fragment = new URLSearchParams(pageAddress.hash.slice(1));
const encoded = fragment.get("card");
if (encoded && encoded.length < 32000) {
  try {
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (data?.format === 1 && typeof data.state === "object" && data.state) {
      seedElement.textContent = JSON.stringify({version:data.version, state:data.state});
      window.openedSharedCard = true;
    }
  } catch { /* A damaged link still opens the default editor. */ }
}
pageSharing.querySelector("button").addEventListener("click", async () => {
  const data = {format:1, version:Date.now().toString(36), state};
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const url = new URL(pageAddress);
  url.hash = new URLSearchParams({card:btoa(String.fromCharCode(...bytes))}).toString();
  shareLink.value = url.href;
  shareLink.hidden = false;
  try {
    await navigator.clipboard.writeText(url.href);
    status.textContent = "현재 명함의 공유 링크를 복사했습니다.";
  } catch {
    shareLink.focus();
    shareLink.select();
    status.textContent = "선택된 링크를 복사해서 보내세요.";
  }
});
if (!/^https?:$/.test(pageAddress.protocol)) pageSharing.hidden = true;

async function fetchResource(path) {
  const response = await fetch(path, path.endsWith("export-template.txt") ? {cache:"no-cache"} : {});
  if (!response.ok) throw new Error(path);
  return response;
}
let koreanPack;
function loadKoreanPack() {
  if (!koreanPack) koreanPack=fetchResource("assets/korean-fonts.json").then(r=>r.json()).catch(error=>{
    koreanPack=null;
    throw error;
  });
  return koreanPack;
}
const hostedFaces=new Map();
async function loadHostedKorean(slug) {
  if (!hostedFaces.has(slug)) {
    const promise=loadKoreanPack().then(async pack=>{
      const data=pack["assets/korean/"+slug+".woff2"];
      if (!data) throw new Error("서체 파일 없음");
      const face=await new FontFace(slug,'url("'+data+'")').load();
      document.fonts.add(face);
    }).catch(error=>{hostedFaces.delete(slug);throw error;});
    hostedFaces.set(slug,promise);
  }
  return hostedFaces.get(slug);
}
async function embedPageResources(copy) {
  const original = await (await fetchResource("assets/export-template.txt")).text();
  const pattern = /@@asset:([a-z0-9/]+):([a-z0-9./-]+)@@/g;
  const matches = [...original.matchAll(pattern)];
  const replacements = new Map();
  for (let offset=0; offset<matches.length; offset+=8) {
    await Promise.all(matches.slice(offset,offset+8).map(async ([token,mime,path]) => {
      if (path.startsWith("assets/korean/")) {
        const uri=(await loadKoreanPack())[path];
        if (!uri) throw new Error(path);
        replacements.set(token,uri);
        return;
      }
      const bytes = await (await fetchResource(path)).arrayBuffer();
      const data = await new Promise((resolve,reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(new Blob([bytes],{type:mime}));
      });
      replacements.set(token,data);
    }));
  }
  const embedded = original.replace(pattern, token => replacements.get(token));
  const doc = new DOMParser().parseFromString(embedded, "text/html");
  doc.querySelector("#published-settings").textContent = copy.querySelector("#published-settings").textContent;
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
