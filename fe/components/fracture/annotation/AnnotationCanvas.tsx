import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StudentAnnotation, Detection } from '@/types/fracture';
import { drawAttentionMaps } from '@/utils/canvas-utils';
import '@/styles/colors.css';

// Styling colors
const getCanvasColors = () => {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return {
    colorActive: styles.getPropertyValue('--color-annotation-active').trim(),
    colorInactive: styles.getPropertyValue('--color-annotation-inactive').trim(),
    colorDrawing: styles.getPropertyValue('--color-annotation-drawing').trim(),
  };
};

interface AnnotationCanvasProps {
  image: HTMLImageElement | null;
  annotations: StudentAnnotation[];
  detections: Detection[];
  currentRect: StudentAnnotation | null;
  isAnnotating: boolean;
  showStudentAnnotations: boolean;
  showAiPredictions: boolean;
  showAttentionOverlay: boolean;
  isDrawing: boolean;
  activeAnnotationId: string | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onAnnotationClick: (annotation: StudentAnnotation) => void;
}

export interface AnnotationCanvasRef {
  redraw: () => void;
  getCanvasRect: () => DOMRect | null;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasRef, AnnotationCanvasProps>(({
  image,
  annotations,
  detections,
  currentRect,
  isAnnotating,
  showStudentAnnotations,
  showAiPredictions,
  showAttentionOverlay,
  isDrawing,
  activeAnnotationId,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onAnnotationClick
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Styling colors
    const { colorActive, colorInactive, colorDrawing } = getCanvasColors();

    // Set canvas size to match image natural size for 1:1 pixel mapping
    canvas.width = image.width;
    canvas.height = image.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image at full resolution
    ctx.drawImage(image, 0, 0, image.width, image.height);

    if (showAttentionOverlay) {
      drawAttentionMaps(
        ctx,
        detections.filter(detection => detection.source === 'ai'),
        image.width,
        image.height
      );
    }

    // No scaling needed - we draw at 1:1 scale
    const scaleX = 1;
    const scaleY = 1;

    // Draw confirmed AI detections
    if (showAiPredictions) {
      detections.filter(d => d.source === 'ai').forEach(detection => {
        ctx.strokeStyle = detection.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          detection.x * scaleX,
          detection.y * scaleY,
          detection.width * scaleX,
          detection.height * scaleY
        );

        ctx.fillStyle = detection.color;
        ctx.font = 'bold 14px Arial';
        ctx.setLineDash([]);
        
        let label = 'AI';
        if (detection.fracture_type) {
          label = `AI: ${detection.fracture_type}`;
        }
        if (detection.confidence) {
          label += ` (${(detection.confidence * 100).toFixed(1)}%)`;
        }
        
        ctx.fillText(label, detection.x * scaleX, detection.y * scaleY - 5);
      });
    }

    // Draw confirmed student detections
    if (showStudentAnnotations) {
      detections.filter(d => d.source === 'student').forEach(detection => {
        ctx.strokeStyle = detection.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(
          detection.x * scaleX,
          detection.y * scaleY,
          detection.width * scaleX,
          detection.height * scaleY
        );

        ctx.fillStyle = detection.color;
        ctx.font = 'bold 14px Arial';
        
        let label = 'Student';
        if (detection.fracture_type) {
          label = `Student: ${detection.fracture_type}`;
        }
        
        ctx.fillText(label, detection.x * scaleX, detection.y * scaleY - 5);
      });
    }

    // Draw draft annotations (not yet confirmed)
    if (showStudentAnnotations) {
      annotations.forEach((annotation, index) => {
        const isActive = annotation.id === activeAnnotationId;
        ctx.strokeStyle = isActive ? colorActive : colorInactive;
        ctx.lineWidth = isActive ? 4 : 3;
        ctx.setLineDash([]);
        ctx.strokeRect(
          annotation.x * scaleX,
          annotation.y * scaleY,
          annotation.width * scaleX,
          annotation.height * scaleY
        );

        ctx.fillStyle = isActive ? colorActive : colorInactive;
        ctx.font = 'bold 14px Arial';
        
        let label = `Draft #${index + 1}`;
        if (annotation.fracture_type) {
          label = `Draft: ${annotation.fracture_type}`;
        }
        
        ctx.fillText(label, annotation.x * scaleX, annotation.y * scaleY - 5);
      });
    }

    // Draw current rectangle being drawn
    if (currentRect && isDrawing) {
      ctx.strokeStyle = colorDrawing;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentRect.x * scaleX,
        currentRect.y * scaleY,
        currentRect.width * scaleX,
        currentRect.height * scaleY
      );
      
      ctx.fillStyle = colorDrawing;
      ctx.font = 'bold 14px Arial';
      ctx.setLineDash([]);
      ctx.fillText('Drawing...', currentRect.x * scaleX, currentRect.y * scaleY - 5);
    }
  }, [
    image, 
    detections, 
    annotations, 
    currentRect, 
    isDrawing, 
    showStudentAnnotations, 
    showAiPredictions,
    showAttentionOverlay
  ]);

  useEffect(() => {
    drawCanvas();
    window.addEventListener('resize', drawCanvas);
    return () => {
      window.removeEventListener('resize', drawCanvas);
    };
  }, [drawCanvas]);

  useImperativeHandle(ref, () => ({
    redraw: drawCanvas,
    getCanvasRect: () => canvasRef.current?.getBoundingClientRect() || null
  }));

  return (
    <canvas
      ref={canvasRef}
      className={`max-w-full max-h-full block ${isAnnotating ? 'cursor-crosshair' : 'cursor-default'}`}
      style={{ objectFit: 'contain' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    />
  );
});

AnnotationCanvas.displayName = 'AnnotationCanvas';