import * as tf from '@tensorflow/tfjs';

// detectWithModel: runs model on video element and returns array of detections:
// [{ x, y, width, height, score }]
// This helper attempts to be compatible with common TFJS-exported YOLO models.
export async function detectWithModel(model, videoEl, frameSize=640, iouThreshold=0.45, scoreThreshold=0.45){
  // Prepare input tensor
  const input = tf.tidy(()=>{
    const t = tf.browser.fromPixels(videoEl);
    const resized = tf.image.resizeBilinear(t, [frameSize, frameSize]);
    return resized.toFloat().div(255.0).expandDims(0);
  });

  let outputs = await model.executeAsync(input);
  if(!Array.isArray(outputs)) outputs = [outputs];

  // Attempt to parse outputs to get boxes and scores
  // Many exports give a single tensor [1,N,6] => [x1,y1,x2,y2,score,class]
  let boxesTensor=null, scoresTensor=null;
  try{
    if(outputs.length===1){
      const s = outputs[0].squeeze();
      const shape = s.shape;
      if(shape.length===2 && shape[1]>=5){
        // assume [N,6] or [N,5]
        boxesTensor = s.slice([0,0],[shape[0],4]); // x1,y1,x2,y2 (probably normalized)
        scoresTensor = s.slice([0,4],[shape[0],1]).squeeze(1);
      }
    }else if(outputs.length>=3){
      boxesTensor = outputs[0].squeeze();
      scoresTensor = outputs[1].squeeze();
    }
  }catch(e){
    console.warn('No se pudo parsear outputs del modelo', e);
  }

  if(!boxesTensor || !scoresTensor){
    tf.dispose([input, ...outputs]);
    return [];
  }

  const boxes = await boxesTensor.array();
  const scores = await scoresTensor.array();

  // map normalized boxes to video pixel coords
  const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
  const mapped = boxes.map(b=>{
    let x1=b[0], y1=b[1], x2=b[2], y2=b[3];
    // if coords look >1, assume model used pixel coords relative to frameSize
    if(x2>1 || y2>1){
      x1 = x1 / frameSize; y1 = y1 / frameSize; x2 = x2 / frameSize; y2 = y2 / frameSize;
    }
    const vx1 = Math.max(0, Math.round(x1 * vw));
    const vy1 = Math.max(0, Math.round(y1 * vh));
    const vx2 = Math.min(vw, Math.round(x2 * vw));
    const vy2 = Math.min(vh, Math.round(y2 * vh));
    return { x: vx1, y: vy1, width: Math.max(1, vx2-vx1), height: Math.max(1, vy2-vy1) };
  });

  // Build tensors for NMS
  const y1 = mapped.map(m=>m.y);
  const x1 = mapped.map(m=>m.x);
  const y2 = mapped.map(m=>m.y + m.height);
  const x2 = mapped.map(m=>m.x + m.width);
  const boxesForNMS = tf.tensor2d(mapped.map(m=>[m.y, m.x, m.y + m.height, m.x + m.width]));
  const scoresForNMS = tf.tensor1d(scores);

  const nmsIdx = await tf.image.nonMaxSuppressionAsync(boxesForNMS, scoresForNMS, 10, iouThreshold, scoreThreshold);
  const selected = await nmsIdx.array();

  const detections = selected.map(i=>{
    return { x: mapped[i].x, y: mapped[i].y, width: mapped[i].width, height: mapped[i].height, score: scores[i] };
  });

  tf.dispose([input, boxesForNMS, scoresForNMS, nmsIdx, ...outputs, boxesTensor, scoresTensor]);
  return detections;
}
