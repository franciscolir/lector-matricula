const video = document.getElementById('video');
const frame = document.getElementById('frame');
const startBtn = document.getElementById('startBtn');
const snapBtn = document.getElementById('snapBtn');
const rawTextEl = document.getElementById('rawText');
const statusEl = document.getElementById('status');
const autoScanEl = document.getElementById('autoScan');
const plateDetectedEl = document.getElementById('plateDetected');
const validateBtn = document.getElementById('validateBtn');
const whitelistTableBody = document.querySelector('#whitelistTable tbody');
const matchBox = document.getElementById('matchBox');
//const cameraSelect = document.getElementById('cameraSelect');
const installBtn = document.getElementById('installBtn');

let stream = null;
let autoTimer = null;
let deferredPrompt = null;

// --- Instalación como PWA ---
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();                                           
  deferredPrompt = e;
  installBtn.hidden = false;                                                
  });

installBtn.addEventListener('click',async()=>{
  installBtn.hidden = true;
   if (deferredPrompt){
     deferredPrompt.prompt();
    await deferredPrompt.userChoice;
     deferredPrompt=null;
   }
});

/*
  async function loadCameras(){
  try{
    const devices=await navigator.mediaDevices.enumerateDevices();
    const cams=devices.filter(d=>d.kind==='videoinput');
    cameraSelect.innerHTML='';cams.forEach((cam,idx)=>
      {const opt=document.createElement('option');
       opt.value=cam.deviceId;
       opt.textContent=cam.label||`Cámara ${idx+1}`;
       cameraSelect.appendChild(opt);
      });
  }catch(e){
    console.warn('No se pudieron listar cámaras',e);
           }}
*/

// --- Iniciar cámara trasera (sin select) ---
async function startCamera(){
  try{
    if(stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    const constraints = {
    video: {
        facingMode: { exact: 'environment' }, // solo cámara trasera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio:false
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    snapBtn.disabled = false;
    status('Cámara iniciada');
  } catch (err) {
    status('Error cámara: '+err.message,true);
  }
}

startBtn.addEventListener('click',async()=>{
  await startCamera();
  //await loadCameras();
});
//cameraSelect.addEventListener('change',startCamera);

// --- Status helper ---
function status(msg,isError=false){
  statusEl.textContent = msg;
  statusEl.style.borderColor = isError ? '#ef4444' : '#374151';
}

function drawFrame(){
  const ctx=frame.getContext('2d');
  const vw=video.videoWidth||640;
  const vh=video.videoHeight||480;
  frame.width=vw;
  frame.height=vh;
  ctx.drawImage(video,0,0,vw,vh);
  return frame;
}

function preprocessFrame(srcCanvas){
  if(typeof cv==='undefined'||!cv.imread)
    return srcCanvas;
  try{
    let src=cv.imread(srcCanvas);
    let dst=new cv.Mat();
    cv.cvtColor(src,dst,cv.COLOR_RGBA2GRAY,0);
    cv.equalizeHist(dst,dst);
    cv.adaptiveThreshold(dst,dst,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,35,15);
    cv.imshow(srcCanvas,dst);
    src.delete();dst.delete();
  }
  catch(e)
  {
      console.warn('Preproc error',e);
    }
  return srcCanvas;
}

// --- Normalización de patentes ---
function normalizePlate(text) {
  const upper = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Patente chilena clásica: 2 letras + 4 números
  const regex1 = /\b([A-Z]{2}[0-9]{4})\b/;
  // Formato inverso: 4 letras + 2 números
  const regex2 = /\b([A-Z]{4}[0-9]{2})\b/;
  // Secuencia genérica de 6 alfanuméricos
  const regex3 = /\b([A-Z0-9]{6})\b/;

  if (regex1.test(upper)) return upper.match(regex1)[1];
  if (regex2.test(upper)) return upper.match(regex2)[1];
  if (regex3.test(upper)) return upper.match(regex3)[1];

  return '';
}

async function runOCR(canvasEl){
  status('OCR...');
  preprocessFrame(canvasEl);
  const worker=await Tesseract.createWorker('eng+spa',1);
  try{
    await worker.setParameters({
      tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    });
    const {data}=await worker.recognize(canvasEl);
    rawTextEl.textContent=data.text.trim();
    const plate=normalizePlate(data.text||'');
    plateDetectedEl.value=plate;
    autoValidate(plate);
    status('OCR listo');
  }
  catch(e){
    status('OCR error: '+e.message,true);
  }
  finally{
    await worker.terminate();
  }}
snapBtn.addEventListener('click',async()=>{
  await runOCR(drawFrame());
});

autoScanEl.addEventListener('change',(e)=>{
  if(e.target.checked){
    autoTimer=setInterval(async()=>{
      if(stream)await runOCR(drawFrame());
    },3000);
  }else{clearInterval(autoTimer);
       }});
const STORAGE_KEY='alpr_whitelist_v2';
function loadWhitelist(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]
  }
  catch
  {
    return[]
  }}
function saveWhitelist(list){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(list));
}
function renderWhitelist(){
  const list=loadWhitelist();
  whitelistTableBody.innerHTML='';
  list.forEach((item,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
    <td>
    <code>${item.plate}</code>
    </td>
    <td>${item.name||''}</td>
    <td>${item.notes||''}</td>
    <td>
    <button data-idx="${idx}" class="remove">Eliminar</button>
    </td>`;
    whitelistTableBody.appendChild(tr);
  });
}

function addToWhitelist(obj){
  const list=loadWhitelist();
  list.push(obj);saveWhitelist(list);
  renderWhitelist();
}

function removeFromWhitelist(idx){
  const list=loadWhitelist();
  list.splice(idx,1);
  saveWhitelist(list);
  renderWhitelist();
}

document.getElementById('addRandom').addEventListener('click',()=>{
  const samples=[
    {plate:'ABC123',name:'Juan Perez',notes:'Visita'},
    {plate:'KJTR45',name:'Camión',notes:'Entrega'},
    {plate:'ZX89HG',name:'Paula',notes:'Residente'}];
  
  addToWhitelist(samples[Math.floor(Math.random()*samples.length)]);
});

document.getElementById('clearList').addEventListener('click',()=>{
  saveWhitelist([]);
  renderWhitelist();
});

whitelistTableBody.addEventListener('click',(e)=>{
  if(e.target.matches('button.remove')){
    removeFromWhitelist(parseInt(e.target.getAttribute('data-idx')));
  }});

function normalizeForCompare(s){
  return(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
}

function autoValidate(plate){
  const normalized=normalizeForCompare(plate);
  if(!normalized)
    return;
  const list=loadWhitelist();
  const found=list.find(item=>normalizeForCompare(item.plate)===normalized);
  if(found){
    matchBox.textContent=`✅ Autorizado: ${found.plate} — ${found.name||''}`;
    matchBox.className='match-box match-ok';
  }else{
    matchBox.textContent=`❌ No autorizado: ${normalized}`;
    matchBox.className='match-box match-bad';
  }}
validateBtn.addEventListener('click',()=>{
  autoValidate(plateDetectedEl.value);
});
if('serviceWorker'in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('service-worker.js');
  });
}
renderWhitelist();
loadCameras();
