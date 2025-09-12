# ALPR PWA (Only-Front) - ZIP deliverable

## What is included
- React + Vite skeleton that runs **only in the browser** (PWA-ready).
- TF.js integration points to load a YOLOv8n-converted model (place `model.json` + `.bin` in `public/models/yolov8n_plate_tfjs/`).
- Tesseract.js OCR helper for extracting plate characters.
- `download_model.sh` helper script to download a pre-trained model (you must provide the model URL or Hugging Face repo info).
- Instructions to run locally.

## Important notes
- The ZIP **does not** include the pretrained model binary (`model.json` / .bin) due to distribution and size constraints.
  I provide a `download_model.sh` script and instructions to fetch a YOLOv8 plate model from Hugging Face or Roboflow.
- You must serve the app over HTTPS to use the rear camera on mobile (or use `localhost` for development).

## Quick start (development)
1. Unzip the project.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Place your TFJS model files in `public/models/yolov8n_plate_tfjs/` (see `download_model.sh`).
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open the app in a mobile browser (HTTPS) and allow camera access.

## How to obtain a TFJS model quickly
- Option A: Download a pre-exported TFJS model from Roboflow or a Hugging Face repository that provides TFJS artifacts.
- Option B: Download a `.pt` YOLOv8 model and convert: `.pt -> onnx -> saved_model -> tfjs` (conversion commands are in the project's docs).

## Contact / Next steps
If you want, I can:
- Provide a Colab script to convert `best.pt` -> TFJS automatically.
- Help download a specific HF/Roboflow model and place it into the ZIP if you share the model URL.
