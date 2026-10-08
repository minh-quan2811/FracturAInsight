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

export function drawAttentionMaps(
  ctx: CanvasRenderingContext2D,
  detections: Array<Pick<Detection, 'attention_map'>>,
  imageWidth: number,
  imageHeight: number
): void {
  const attentionDetections = detections.filter(
    detection => detection.attention_map?.encoding === 'uint8_base64'
  );
  if (attentionDetections.length === 0) return;

  const overlay = document.createElement('canvas');

  attentionDetections.forEach(detection => {
    const map = detection.attention_map;
    if (!map || map.width <= 0 || map.height <= 0) return;

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

    overlay.width = map.width;
    overlay.height = map.height;
    const overlayContext = overlay.getContext('2d');
    if (!overlayContext) return;

    const imageData = overlayContext.createImageData(map.width, map.height);
    for (let i = 0; i < binary.length; i += 1) {
      const intensity = binary.charCodeAt(i) / 255;
      const offset = i * 4;
      imageData.data[offset] = Math.round(intensity * 255);
      imageData.data[offset + 1] = Math.round(
        Math.max(0, 1 - Math.abs(intensity - 0.5) * 2) * 220
      );
      imageData.data[offset + 2] = Math.round((1 - intensity) * 255);
      imageData.data[offset + 3] = Math.round(intensity * 170);
    }

    overlayContext.putImageData(imageData, 0, 0);
    ctx.drawImage(overlay, 0, 0, imageWidth, imageHeight);
  });
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