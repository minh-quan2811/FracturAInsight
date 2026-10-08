import React, { useRef, useEffect, useState } from 'react';
import { DocumentUpload } from '@/types';
import { Detection, PredictionModel, StudentAnnotation } from '@/types/fracture';
import { useFractureImage, useAnnotationDrawing, useFracturePredictionAPI, usePredictionRevision } from '@/hooks/fracture';
import { AnnotationCanvas, AnnotationCanvasRef, AnnotationDialog, AnnotationVisibilityToggle } from '../annotation';
import { ImageUploadZone } from '../upload';
import { DetectionLists, ErrorDisplay, PredictionStatusCard, StudentActionButtons } from './index';
import { FractureReferenceButton, FractureReferenceSidePanel } from '../reference';
import { ComparisonResultsButton, ComparisonResultsSidePanel } from '../comparison';
import { HistorySection, HistoryPage } from '../history';
import { DocumentHistorySection, DocumentHistoryPage } from '../document';

interface FractureDetectionPanelProps {
  token: string;
  documentHistory?: DocumentUpload[];
  onRefreshDocuments?: () => void;
}

/**
 * AnimatedBlock — fades in + slides up on expand, fades out on collapse.
 * `delay` only applies on expand so collapse is instant and simultaneous.
 */
function AnimatedBlock({
  children,
  isVisible,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  isVisible: boolean;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0px)' : 'translateY(16px)',
        transition: 'opacity 520ms ease, transform 520ms ease',
        transitionDelay: isVisible ? `${delay}ms` : `${Math.round(delay * 0.4)}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function FractureDetectionPanel({
  token,
  documentHistory = [],
  onRefreshDocuments,
}: FractureDetectionPanelProps) {
  const canvasRef = useRef<AnnotationCanvasRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRootRef = useRef<HTMLDivElement>(null);

  // History navigation state
  const [showHistory, setShowHistory] = React.useState(false);
  const [showDocumentHistory, setShowDocumentHistory] = React.useState(false);

  // UI states
  const [showStudentAnnotations, setShowStudentAnnotations] = React.useState(true);
  const [showAiPredictions, setShowAiPredictions] = React.useState(true);
  const [showAttentionOverlay, setShowAttentionOverlay] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<PredictionModel>('yolo');
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [completedAnnotationIds, setCompletedAnnotationIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isFetchingComparison, setIsFetchingComparison] = useState(false);
  const [isReferencePanelOpen, setIsReferencePanelOpen] = useState(false);
  const [isComparisonPanelOpen, setIsComparisonPanelOpen] = useState(false);

  const {
    image,
    isUploading,
    error: imageError,
    uploadImage,
    clearImage,
    setError: setImageError,
  } = useFractureImage();

  const {
    annotations,
    isAnnotating,
    isDrawing,
    currentRect,
    setIsAnnotating,
    updateAnnotation,
    removeAnnotation,
    clearAnnotations,
    handleMouseDown: onMouseDown,
    handleMouseMove: onMouseMove,
    handleMouseUp: onMouseUp,
    addAnnotation,
  } = useAnnotationDrawing();

  const {
    currentPrediction,
    comparison,
    allDetections,
    isSubmittingAnnotations,
    isRunningAI,
    error: apiError,
    setCurrentPrediction,
    setAllDetections,
    submitAnnotations: submitAnnotationsAPI,
    runAI,
    fetchComparison,
    clearPrediction,
  } = useFracturePredictionAPI();

  const {
    isRevising,
    reviseError,
    loadPredictionForRevision,
    clearReviseError,
  } = usePredictionRevision();

  // Derived state
  const error = imageError || apiError || reviseError;
  const setError = (err: string | null) => {
    setImageError(err);
    clearReviseError();
  };

  const allAnnotationsHaveDetails = annotations.length === 0 ||
    annotations.every((ann) =>
      Boolean(ann.fracture_type) && completedAnnotationIds.has(ann.id)
    );

  const showComparisonOnly =
    currentPrediction?.has_student_predictions &&
    currentPrediction?.has_ai_predictions &&
    comparison;

  const canSubmit = currentPrediction && !currentPrediction.has_student_predictions;

  // Before AI results exist, size the image to fill the panel so the image,
  // buttons and annotation banner all fit without scrolling.
  const fitToPanel = !!image && !currentPrediction?.has_ai_predictions && !isRunningAI;

  // Open the Comparison Results side panel automatically once the comparison is
  // ready (and close it when there's no comparison, e.g. after Clear / revise),
  // so the image stays visible next to the results — same layout as History.
  const hasComparison = !!showComparisonOnly;
  useEffect(() => {
    setIsComparisonPanelOpen(hasComparison);
  }, [hasComparison, currentPrediction?.id]);

  // Auto-open dialog when new annotation is created
  useEffect(() => {
    if (annotations.length > 0 && !isDrawing) {
      const latestAnnotation = annotations[annotations.length - 1];
      if (!latestAnnotation.fracture_type) {
        setOpenDialogId(latestAnnotation.id);
        setActiveAnnotationId(latestAnnotation.id);
      }
    }
  }, [annotations.length, isDrawing]);

  // Auto-fetch comparison when both predictions exist
  useEffect(() => {
    if (
      currentPrediction?.has_student_predictions &&
      currentPrediction?.has_ai_predictions &&
      !comparison
    ) {
      setIsFetchingComparison(true);
      fetchComparison(currentPrediction.id, token).finally(() =>
        setIsFetchingComparison(false)
      );
    }
  }, [
    currentPrediction?.has_student_predictions,
    currentPrediction?.has_ai_predictions,
    comparison,
    fetchComparison,
    token,
    currentPrediction?.id,
  ]);

  // Show history pages
  if (showHistory) {
    return <HistoryPage token={token} onBack={() => setShowHistory(false)} />;
  }

  if (showDocumentHistory) {
    return (
      <DocumentHistoryPage
        token={token}
        onBack={() => setShowDocumentHistory(false)}
        documents={documentHistory}
        onRefresh={onRefreshDocuments}
      />
    );
  }

  // ── Event handlers (unchanged) ────────────────────────────────────────────

  const handleImageUpload = async (file: File) => {
    try {
      const prediction = await uploadImage(file, token);
      setCurrentPrediction(prediction);
      setSelectedModel('yolo');
      setShowAttentionOverlay(false);
      clearAnnotations();
      setCompletedAnnotationIds(new Set());
      setAllDetections([]);
      setOpenDialogId(null);
      setActiveAnnotationId(null);
    } catch (err: Error | unknown) {
      console.error('Upload error:', err);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = image.width / rect.width;
    const scaleY = image.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isAnnotating) {
      onMouseDown(x, y);
    } else {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i];
        if (
          x >= ann.x && x <= ann.x + ann.width &&
          y >= ann.y && y <= ann.y + ann.height
        ) {
          handleAnnotationClick(ann);
          return;
        }
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !image) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = image.width / rect.width;
    const scaleY = image.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    onMouseMove(x, y);
  };

  const handleCanvasMouseUp = () => onMouseUp();

  const handleAnnotationClick = (annotation: StudentAnnotation) => {
    if (openDialogId === annotation.id) {
      setOpenDialogId(null);
      setActiveAnnotationId(null);
    } else {
      setActiveAnnotationId(annotation.id);
      setOpenDialogId(annotation.id);
    }
  };

  const handleUpdateAnnotation = (annotation: StudentAnnotation) => {
    setCompletedAnnotationIds(previous => {
      const next = new Set(previous);
      next.delete(annotation.id);
      return next;
    });
    updateAnnotation(annotation.id, {
      fracture_type: annotation.fracture_type || '',
      notes: annotation.notes,
    });
  };

  const handleCloseDialog = () => setOpenDialogId(null);

  const handleDoneAnnotation = (annotation: StudentAnnotation) => {
    if (!annotation.fracture_type) return;
    setCompletedAnnotationIds(previous => new Set(previous).add(annotation.id));
    setOpenDialogId(null);
  };

  const handleRemoveAnnotation = (id: string) => {
    removeAnnotation(id);
    setCompletedAnnotationIds(previous => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
    if (openDialogId === id) setOpenDialogId(null);
    if (activeAnnotationId === id) setActiveAnnotationId(null);
  };

  const handleSubmitAnnotations = async () => {
    if (!currentPrediction) return;
    if (annotations.length > 0) {
      const missingDetails = annotations.some((ann) =>
        !ann.fracture_type || !completedAnnotationIds.has(ann.id)
      );
      if (missingDetails) {
        setError('Please select a fracture type and press Done for every annotation');
        return;
      }
    }
    await submitAnnotationsAPI(currentPrediction.id, annotations, token);
    clearAnnotations();
    setCompletedAnnotationIds(new Set());
    setIsAnnotating(false);
    setOpenDialogId(null);
    setActiveAnnotationId(null);
  };

  const handleSubmitNoFracture = async () => {
    if (!currentPrediction) return;
    await submitAnnotationsAPI(currentPrediction.id, [], token);
    clearAnnotations();
    setCompletedAnnotationIds(new Set());
    setIsAnnotating(false);
    setOpenDialogId(null);
    setActiveAnnotationId(null);
  };

  const handleRevisePrediction = async () => {
    if (!currentPrediction) return;
    try {
      await loadPredictionForRevision(currentPrediction.id, token, (loadedAnnotations) => {
        setAllDetections(
          Array.isArray(allDetections)
            ? allDetections.filter((d: Detection) => d.source !== 'student')
            : []
        );
        clearAnnotations();
        setCompletedAnnotationIds(new Set());
        loadedAnnotations.forEach((ann) => addAnnotation(ann));
        if (currentPrediction) {
          setCurrentPrediction({
            ...currentPrediction,
            has_student_predictions: false,
            student_prediction_count: 0,
          });
        }
        setIsAnnotating(true);
        setOpenDialogId(null);
        setActiveAnnotationId(null);
      });
    } catch (err) {
      console.error('Error revising prediction:', err);
    }
  };

  const handleRunAiPrediction = async () => {
    if (!currentPrediction) return;
    await runAI(currentPrediction.id, token, selectedModel);
  };

  const handleClearAll = () => {
    clearPrediction();
    clearImage();
    clearAnnotations();
    setCompletedAnnotationIds(new Set());
    setIsAnnotating(false);
    setOpenDialogId(null);
    setActiveAnnotationId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={panelRootRef} className="h-full bg-white border-l border-gray-100 flex flex-col overflow-visible">

      {/* Fracture Type Reference — slides out from the Detection Panel's left edge,
          hugging its position/size, while the Detection Panel stays fully visible and usable */}
      <FractureReferenceSidePanel
        isOpen={isReferencePanelOpen}
        onClose={() => setIsReferencePanelOpen(false)}
        anchorRef={panelRootRef}
      />

      {/* Comparison Results — slides out to the left of the Detection Panel,
          the same way it does on the History page */}
      <ComparisonResultsSidePanel
        isOpen={isComparisonPanelOpen}
        onClose={() => setIsComparisonPanelOpen(false)}
        anchorRef={panelRootRef}
        comparison={comparison}
        imageKey={currentPrediction?.id}
      />

      {/* ── Panel Header ── */}
      <div className="flex-shrink-0 px-4 py-3.5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">

          {/* Toggle + Title */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2.5 group"
            aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-gray-400 transition-transform duration-300 ease-in-out"
              style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-800 tracking-tight group-hover:text-gray-900 transition-colors duration-150">
              Fracture Detection
            </h3>
          </button>

          {/* Clear button */}
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 text-xs font-medium text-gray-400 rounded-lg border border-gray-200 bg-white hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
          >
            Clear
          </button>
        </div>
      </div>

      {/*
        ── Accordion content area ──────────────────────────────────────────────
        Uses the CSS grid-template-rows trick: animating from 0fr → 1fr gives a
        smooth, natural height collapse without needing to know the content height.

        Structure:
          grid wrapper  (flex-1, grid layout, transitions grid-template-rows)
            clip div    (min-h-0 + overflow:hidden  — clips content during animation)
              scroll div (overflow-y-auto, h-full   — scrollable content area)
                content  (p-4 space-y-4             — actual blocks)
      */}
      <div
        className="flex-1 min-h-0"
        style={{
          display: 'grid',
          gridTemplateRows: isCollapsed ? '0fr' : '1fr',
          transition: 'grid-template-rows 520ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          <div className="overflow-y-auto overflow-x-hidden h-full">
            <div className={fitToPanel ? 'p-3 h-full flex flex-col gap-3' : 'p-3 space-y-3'}>

              {/* Error display — no animation, always immediate */}
              <ErrorDisplay error={error} onDismiss={() => setError(null)} />

              {!image ? (
                <>
                  {/*
                    The 3 main blocks — each wrapped in AnimatedBlock.
                    On expand: staggered fade-in + slide up (delays: 80 / 180 / 280ms).
                    On collapse: simultaneous fade-out, no delay.
                  */}
                  <AnimatedBlock isVisible={!isCollapsed} delay={100}>
                    <ImageUploadZone
                      onImageUpload={handleImageUpload}
                      isUploading={isUploading}
                    />
                  </AnimatedBlock>

                  <AnimatedBlock isVisible={!isCollapsed} delay={240}>
                    <HistorySection onNavigateToHistory={() => setShowHistory(true)} />
                  </AnimatedBlock>

                  <AnimatedBlock isVisible={!isCollapsed} delay={380}>
                    <DocumentHistorySection
                      onNavigateToHistory={() => setShowDocumentHistory(true)}
                      recentDocuments={documentHistory}
                    />
                  </AnimatedBlock>
                </>
              ) : (
                /* Image loaded — single animated content block */
                <AnimatedBlock
                  isVisible={!isCollapsed}
                  delay={100}
                  className={fitToPanel ? 'flex-1 min-h-0 flex flex-col' : undefined}
                >
                  <div className={fitToPanel ? 'flex-1 min-h-0 flex flex-col gap-2' : 'space-y-2'}>
                    {/* Status Card */}
                    <PredictionStatusCard
                      currentPrediction={currentPrediction}
                      isRevising={isRevising}
                      onRevise={handleRevisePrediction}
                      isRunningAI={isRunningAI}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
                      hasAttentionMaps={allDetections.some(
                        detection => detection.source === 'ai' && !!detection.attention_map
                      )}
                      onRunAI={handleRunAiPrediction}
                    />

                    {/* Reference panel toggle */}
                    {!currentPrediction?.has_student_predictions && (
                      <FractureReferenceButton
                        isOpen={isReferencePanelOpen}
                        onClick={() => setIsReferencePanelOpen((prev) => !prev)}
                      />
                    )}

                    {/* Comparison panel toggle */}
                    {showComparisonOnly && (
                      <ComparisonResultsButton
                        isOpen={isComparisonPanelOpen}
                        onClick={() => setIsComparisonPanelOpen((prev) => !prev)}
                        hasData={!!comparison}
                        variant="panel"
                      />
                    )}

                    {/* Image with annotation canvas */}
                    <div
                      ref={containerRef}
                      className={`relative w-full bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center p-2 ${
                        fitToPanel ? 'flex-1 min-h-0 overflow-hidden' : ''
                      }`}
                      style={fitToPanel ? { minHeight: '240px' } : { height: 'clamp(320px, 70vh, 680px)' }}
                    >
                      <AnnotationCanvas
                        ref={canvasRef}
                        image={image}
                        annotations={annotations}
                        detections={allDetections}
                        currentRect={currentRect}
                        isAnnotating={isAnnotating}
                        showStudentAnnotations={showStudentAnnotations}
                        showAiPredictions={showAiPredictions}
                        showAttentionOverlay={showAttentionOverlay}
                        isDrawing={isDrawing}
                        activeAnnotationId={activeAnnotationId}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onAnnotationClick={handleAnnotationClick}
                      />

                      {image && (
                        <AnnotationVisibilityToggle
                          showStudentAnnotations={showStudentAnnotations}
                          showAiPredictions={showAiPredictions}
                          onToggleStudent={() => setShowStudentAnnotations(!showStudentAnnotations)}
                          onToggleAi={() => setShowAiPredictions(!showAiPredictions)}
                          studentCount={currentPrediction?.student_prediction_count || annotations.length}
                          aiCount={currentPrediction?.ai_prediction_count || 0}
                          hasAiPredictions={!!currentPrediction?.has_ai_predictions}
                          hasAttentionMaps={allDetections.some(
                            detection => detection.source === 'ai' && !!detection.attention_map
                          )}
                          showAttentionControl={
                            selectedModel === 'rfdetr' &&
                            !!currentPrediction?.has_ai_predictions
                          }
                          showAttentionOverlay={showAttentionOverlay}
                          onToggleAttention={() => setShowAttentionOverlay(value => !value)}
                        />
                      )}
                    </div>

                    {/* Annotation dialogs */}
                    {image &&
                      annotations.map((annotation, index) => {
                        if (openDialogId !== annotation.id) return null;
                        return (
                          <AnnotationDialog
                            key={annotation.id}
                            annotation={annotation}
                            index={index}
                            canvasRef={canvasRef}
                            image={image}
                            onUpdate={handleUpdateAnnotation}
                            onRemove={handleRemoveAnnotation}
                            onClose={handleCloseDialog}
                            onDone={handleDoneAnnotation}
                            isActive={activeAnnotationId === annotation.id}
                          />
                        );
                      })}

                    {/* Action buttons */}
                    <StudentActionButtons
                      isAnnotating={isAnnotating}
                      annotations={annotations}
                      isSubmittingAnnotations={isSubmittingAnnotations}
                      allAnnotationsHaveDetails={allAnnotationsHaveDetails}
                      canSubmit={!!canSubmit}
                      onToggleAnnotating={() => setIsAnnotating(!isAnnotating)}
                      onSubmitAnnotations={handleSubmitAnnotations}
                      onSubmitNoFracture={handleSubmitNoFracture}
                      onClearAnnotations={clearAnnotations}
                    />

                  </div>

                  {/* Comparison / detection lists */}
                  {/* Once the comparison is ready it lives in the side panel instead */}
                  {!showComparisonOnly &&
                    currentPrediction &&
                    (currentPrediction.has_student_predictions ||
                      currentPrediction.has_ai_predictions) && (
                      <DetectionLists
                        detections={allDetections}
                        modelVersion={currentPrediction.model_version}
                        isFetchingComparison={isFetchingComparison}
                      />
                    )}
                </AnimatedBlock>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}