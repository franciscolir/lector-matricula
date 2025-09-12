import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { detectWithModel } from './utils/yoloDetector';
import { runOCR } from './utils/ocrHelper';

const MODEL_URL = '/models/yolov8n_plate_tfjs/model.json';
const FRAME_SIZE = 640;
const FRAME_INTERVAL_MS = 600;
const CHILE_PLATE_REGEX = /^([A-Z]{2}\d{4}|[A-Z]{4}\d{2})$/i;

export default function App(){
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const modelRef = useRef(null);
  const processingRef = useRef(false);
  const [status, setStatus] = useState('Inicializando...');
  const [detectedPlate, setDetectedPlate] = useState(null);
  const [ocrRaw, setOcrRaw] = useState('');

  useEffect(()=>{ (async ()=>{
    setStatus('Cargando TF.js backend...');
    await tf.setBackend('webgl');
    await tf.ready();
    setStatus('Cargando modelo TFJS...');
    try{
      modelRef.current = await tf.loadGraphModel(MODEL_URL);
      setStatus('Modelo cargado. Solicitando cámara...');
    }catch(e){
      console.error(e);
      setStatus('Error cargando modelo: ' + e.message);
    }
  })(); },[]);

  useEffect(()=>{ (async ()=>{
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width:{ideal:1280}, height:{ideal:720} }, audio:false });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('Cámara iniciada');
    }catch(e){
      console.error(e);
      setStatus('No se pudo iniciar cámara: ' + e.message);
    }
  })(); return ()=>{ if(videoRef.current && videoRef.current.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop()); } },[]);

  useEffect(()=>{
    const iv = setInterval(async ()=>{
      if(!modelRef.current || !videoRef.current || videoRef.current.readyState<2) return;
      if(processingRef.current) return;
      processingRef.current = true;
      setStatus('Detectando...');
      try{
        const detections = await detectWithModel(modelRef.current, videoRef.current, FRAME_SIZE, 0.45, 0.45);
        const canvas = overlayRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.clearRect(0,0,canvas.width,canvas.height);

        if(detections && detections.length>0){
          const best = detections[0];
          ctx.lineWidth = Math.max(2, Math.round(canvas.width * 0.003));
          ctx.strokeStyle = 'lime';
          ctx.strokeRect(best.x, best.y, best.width, best.height);

          // crop and OCR
          const crop = document.createElement('canvas');
          const pad = Math.round(Math.min(best.width, best.height) * 0.05);
          const cx = Math.max(0, best.x - pad);
          const cy = Math.max(0, best.y - pad);
          const cw = Math.min(canvas.width - cx, best.width + pad*2);
          const ch = Math.min(canvas.height - cy, best.height + pad*2);
          crop.width = cw; crop.height = ch;
          const cctx = crop.getContext('2d');
          cctx.drawImage(videoRef.current, cx, cy, cw, ch, 0, 0, cw, ch);

          setStatus('Procesando OCR...');
          const raw = await runOCR(crop);
          setOcrRaw(raw);
          const cleaned = raw.replace(/\s+/g,'').toUpperCase();
          if(CHILE_PLATE_REGEX.test(cleaned)){
            setDetectedPlate(cleaned);
            setStatus('Placa válida: ' + cleaned);
          }else{
            setDetectedPlate(null);
            setStatus('OCR no válido: ' + (cleaned || '(vacío)'));
          }
        }else{
          setDetectedPlate(null);
          setOcrRaw('');
          setStatus('Sin detecciones');
        }
      }catch(e){
        console.error(e);
        setStatus('Error: ' + e.message);
      }finally{
        processingRef.current = false;
      }
    }, FRAME_INTERVAL_MS);
    return ()=> clearInterval(iv);
  },[]);

  return (
    <div>
      <h2>ALPR PWA - TFJS YOLO + Tesseract (Only-Front)</h2>
      <p className="status">{status}</p>
      <div className="video-wrap">
        <video ref={videoRef} playsInline muted></video>
        <canvas ref={overlayRef} className="overlay"></canvas>
      </div>
      <div style={{marginTop:12}}>
        <strong>OCR raw:</strong><div>{ocrRaw || '-'}</div>
        <strong>Placa válida:</strong><div style={{fontSize:20,fontWeight:700}}>{detectedPlate || '-'}</div>
        <p style={{color:'#666'}}>Coloca tu modelo TFJS en <code>public/models/yolov8n_plate_tfjs/</code> como <code>model.json</code> y sus shards.</p>
      </div>
    </div>
  );
}
