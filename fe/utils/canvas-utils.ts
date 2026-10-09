import { Detection, StudentAnnotation } from '@/types';

/**
 * Get canvas coordinates from mouse event, scaled to image coordinates
 */
export function getCanvasCoordinates(
  canvas: HTMLCanvasElement, 
  event: React.MouseEvent<HTMLCanvasElement>, 
  image: HTMLImageElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = image.width / canvas.clientWidth;
  const scaleY = image.height / canvas.clientHeight;
  
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

/**
 * Draw a bounding box on canvas
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  detection: Detection,
  scaleX: number,
  scaleY: number,
  options: {
    strokeStyle?: string;
    lineWidth?: number;
    lineDash?: number[];
    showLabel?: boolean;
    labelFont?: string;
  } = {}
): void {
  const {
    strokeStyle = detection.color,
    lineWidth = 2,
    lineDash = detection.source === 'ai' ? [5, 5] : [],
    showLabel = true,
    labelFont = '12px Arial'
  } = options;

  // Draw bounding box
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(lineDash);
  
  ctx.strokeRect(
    detection.x * scaleX,
    detection.y * scaleY,
    detection.width * scaleX,
    detection.height * scaleY
  );

  // Draw label
  if (showLabel) {
    ctx.fillStyle = strokeStyle;
    ctx.font = labelFont;
    ctx.setLineDash([]);
    
    const label = detection.confidence 
      ? `${detection.label} (${(detection.confidence * 100).toFixed(1)}%)`
      : detection.label;
    
    ctx.fillText(
      label, 
      detection.x * scaleX, 
      detection.y * scaleY - 5
    );
  }
}

const ATTENTION_ALPHA = 0.55;
const ATTENTION_MAX_SIDE = 1024;

// Same piecewise-linear "jet" colormap that matplotlib uses in the Python test script.
function jetChannel(v: number, points: Array<[number, number]>): number {
  if (v <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    if (v <= points[i][0]) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

const JET_RED: Array<[number, number]> = [[0, 0], [0.35, 0], [0.66, 1], [0.89, 1], [1, 0.5]];
const JET_GREEN: Array<[number, number]> = [[0, 0], [0.125, 0], [0.375, 1], [0.64, 1], [0.91, 0], [1, 0]];
const JET_BLUE: Array<[number, number]> = [[0, 0.5], [0.11, 1], [0.34, 1], [0.65, 0], [1, 0]];

let jetLut: Uint8ClampedArray | null = null;

function getJetLut(): Uint8ClampedArray {
  if (jetLut) return jetLut;
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i += 1) {
    const v = i / 255;
    lut[i * 3] = Math.round(jetChannel(v, JET_RED) * 255);
    lut[i * 3 + 1] = Math.round(jetChannel(v, JET_GREEN) * 255);
    lut[i * 3 + 2] = Math.round(jetChannel(v, JET_BLUE) * 255);
  }
  jetLut = lut;
  return lut;
}

/**
 * Draw RF-DETR attention on top of the image already painted on ctx.
 * It matches the Python test script: all maps are merged into one heatmap
 * (strongest value wins), colored with "jet", and blended over the whole
 * image with one fixed opacity.
 */
export function drawAttentionMaps(
  ctx: CanvasRenderingContext2D,
  detections: Array<Pick<Detection, 'attention_map'>>,
  imageWidth: number,
  imageHeight: number,
  opacity: number = ATTENTION_ALPHA
): void {
  const maps = detections
    .map(detection => detection.attention_map)
    .filter(map => map && map.encoding === 'uint8_base64' && map.width > 0 && map.height > 0);
  if (maps.length === 0) return;

  // Work at a limited size so big images stay fast.
  const scale = Math.min(1, ATTENTION_MAX_SIDE / Math.max(imageWidth, imageHeight));
  const outW = Math.max(1, Math.round(imageWidth * scale));
  const outH = Math.max(1, Math.round(imageHeight * scale));

  // Gray canvas: every map is stretched to the image size and merged with "lighten" (max).
  const gray = document.createElement('canvas');
  gray.width = outW;
  gray.height = outH;
  const grayCtx = gray.getContext('2d');
  if (!grayCtx) return;
  grayCtx.fillStyle = '#000';
  grayCtx.fillRect(0, 0, outW, outH);
  grayCtx.globalCompositeOperation = 'lighten';
  grayCtx.imageSmoothingEnabled = true;
  grayCtx.imageSmoothingQuality = 'high';

  let drawn = 0;
  maps.forEach(map => {
    if (!map) return;

    let binary: string;
    try {
      binary = atob(map.data);
    } catch (error) {
      console.error('Failed to decode RF-DETR attention map:', error);
      return;
    }
    if (binary.length !== map.width * map.height) {
      console.error('RF-DETR attention map dimensions do not match its data.');
      return;
    }

    const small = document.createElement('canvas');
    small.width = map.width;
    small.height = map.height;
    const smallCtx = small.getContext('2d');
    if (!smallCtx) return;

    const smallData = smallCtx.createImageData(map.width, map.height);
    for (let i = 0; i < binary.length; i += 1) {
      const value = binary.charCodeAt(i);
      const offset = i * 4;
      smallData.data[offset] = value;
      smallData.data[offset + 1] = value;
      smallData.data[offset + 2] = value;
      smallData.data[offset + 3] = 255;
    }
    smallCtx.putImageData(smallData, 0, 0);

    grayCtx.drawImage(small, 0, 0, outW, outH);
    drawn += 1;
  });
  if (drawn === 0) return;

  // Color the merged heatmap with jet and give every pixel the same opacity.
  const merged = grayCtx.getImageData(0, 0, outW, outH);
  const lut = getJetLut();
  const alpha = Math.round(Math.min(1, Math.max(0, opacity)) * 255);
  for (let i = 0; i < merged.data.length; i += 4) {
    const value = merged.data[i];
    merged.data[i] = lut[value * 3];
    merged.data[i + 1] = lut[value * 3 + 1];
    merged.data[i + 2] = lut[value * 3 + 2];
    merged.data[i + 3] = alpha;
  }
  grayCtx.globalCompositeOperation = 'source-over';
  grayCtx.putImageData(merged, 0, 0);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(gray, 0, 0, imageWidth, imageHeight);
  ctx.restore();
}

/**
 * Draw student annotation on canvas
 */
export function drawStudentAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: StudentAnnotation,
  scaleX: number,
  scaleY: number,
  index: number,
  options: {
    strokeStyle?: string;
    lineWidth?: number;
    showLabel?: boolean;
  } = {}
): void {
  const {
    strokeStyle = '#3b82f6',
    lineWidth = 2,
    showLabel = true
  } = options;

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);
  
  ctx.strokeRect(
    annotation.x * scaleX,
    annotation.y * scaleY,
    annotation.width * scaleX,
    annotation.height * scaleY
  );

  if (showLabel) {
    ctx.fillStyle = strokeStyle;
    ctx.font = '12px Arial';
    ctx.fillText(
      `Draft #${index + 1}`, 
      annotation.x * scaleX, 
      annotation.y * scaleY - 5
    );
  }
}

/**
 * Draw current rectangle being drawn
 */
export function drawCurrentRect(
  ctx: CanvasRenderingContext2D,
  rect: StudentAnnotation,
  scaleX: number,
  scaleY: number,
  options: {
    strokeStyle?: string;
    lineWidth?: number;
    lineDash?: number[];
  } = {}
): void {
  const {
    strokeStyle = '#3b82f6',
    lineWidth = 2,
    lineDash = [3, 3]
  } = options;

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(lineDash);
  
  ctx.strokeRect(
    rect.x * scaleX,
    rect.y * scaleY,
    rect.width * scaleX,
    rect.height * scaleY
  );
}

/**
 * Calculate canvas dimensions maintaining aspect ratio
 */
export function calculateCanvasDimensions(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): { canvasWidth: number; canvasHeight: number; scaleX: number; scaleY: number } {
  const imageAspectRatio = imageWidth / imageHeight;
  let canvasWidth, canvasHeight;

  if (containerWidth / containerHeight > imageAspectRatio) {
    canvasHeight = containerHeight;
    canvasWidth = containerHeight * imageAspectRatio;
  } else {
    canvasWidth = containerWidth;
    canvasHeight = containerWidth / imageAspectRatio;
  }

  const scaleX = canvasWidth / imageWidth;
  const scaleY = canvasHeight / imageHeight;

  return { canvasWidth, canvasHeight, scaleX, scaleY };
}

/**
 * Check if a point is inside a detection/annotation
 */
export function isPointInside(
  point: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Create a normalized rectangle from two points
 */
export function createRect(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number }
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  return { x, y, width, height };
}

/**
 * Validate if a rectangle is large enough to be considered valid
 */
export function isValidRect(
  rect: { width: number; height: number },
  minSize: number = 10
): boolean {
  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Convert detection to student annotation format
 */
export function detectionToAnnotation(
  detection: Detection,
  id?: string
): StudentAnnotation {
  return {
    id: id || `annotation-${Date.now()}-${Math.random()}`,
    x: detection.x,
    y: detection.y,
    width: detection.width,
    height: detection.height,
    notes: ''
  };
}

/**
 * Convert student annotation to detection format for display
 */
export function annotationToDetection(
  annotation: StudentAnnotation,
  index: number
): Detection {
  return {
    id: annotation.id,
    x: annotation.x,
    y: annotation.y,
    width: annotation.width,
    height: annotation.height,
    label: `Student #${index + 1}`,
    color: '#3b82f6',
    source: 'student'
  };
}

/**
 * Calculate intersection over union (IoU) between two rectangles
 */
export function calculateIoU(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(rect1.x, rect2.x);
  const y1 = Math.max(rect1.y, rect2.y);
  const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

  if (x2 <= x1 || y2 <= y1) {
    return 0; // No intersection
  }

  const intersectionArea = (x2 - x1) * (y2 - y1);
  const rect1Area = rect1.width * rect1.height;
  const rect2Area = rect2.width * rect2.height;
  const unionArea = rect1Area + rect2Area - intersectionArea;

  return intersectionArea / unionArea;
}

/**
 * Find the closest detection to a given annotation
 */
export function findClosestDetection(
  annotation: StudentAnnotation,
  detections: Detection[]
): { detection: Detection; distance: number; iou: number } | null {
  if (detections.length === 0) return null;

  let closest = null;
  let minDistance = Infinity;
  let bestIoU = 0;

  for (const detection of detections) {
    // Calculate center-to-center distance
    const annotationCenterX = annotation.x + annotation.width / 2;
    const annotationCenterY = annotation.y + annotation.height / 2;
    const detectionCenterX = detection.x + detection.width / 2;
    const detectionCenterY = detection.y + detection.height / 2;

    const distance = Math.sqrt(
      Math.pow(annotationCenterX - detectionCenterX, 2) +
      Math.pow(annotationCenterY - detectionCenterY, 2)
    );

    const iou = calculateIoU(annotation, detection);

    if (distance < minDistance || (distance === minDistance && iou > bestIoU)) {
      minDistance = distance;
      bestIoU = iou;
      closest = { detection, distance, iou };
    }
  }

  return closest;
}