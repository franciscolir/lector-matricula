// Simple wrapper for Tesseract.js OCR using CDN-loaded Tesseract.
export async function runOCR(canvas){
  if(!window.Tesseract){
    await new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/tesseract.js@v2.1.5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const worker = window.Tesseract.createWorker({ logger: ()=>{} });
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  await worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' });
  const { data } = await worker.recognize(canvas);
  await worker.terminate();
  const text = data && data.text ? data.text.replace(/\s+/g,'') : '';
  return text.toUpperCase();
}
