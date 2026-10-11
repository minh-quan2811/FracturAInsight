import React, { useState, useRef, useEffect, ReactNode } from "react";

interface ResizableLayoutProps {
  children: ReactNode;
  className?: string;
}

interface PanelProps {
  children: ReactNode;
  defaultSize?: number;
  minSize?: number;
  className?: string;
}

interface SplitterProps {
  className?: string;
}

export function ResizableLayout({ children, className = "" }: ResizableLayoutProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [leftPanelSize, setLeftPanelSize] = useState(60);
  const containerRef = useRef<HTMLDivElement>(null);

  const childrenArray = React.Children.toArray(children);

  // Type-safe filtering with type predicates
  const panels = childrenArray.filter(
    (child): child is React.ReactElement<PanelProps> =>
      React.isValidElement(child) && child.type === Panel
  );

  const splitter = childrenArray.find(
    (child): child is React.ReactElement<SplitterProps> =>
      React.isValidElement(child) && child.type === Splitter
  );

  const leftPanel = panels[0];
  const rightPanel = panels[1];

  useEffect(() => {
    if (leftPanel?.props.defaultSize) {
      setLeftPanelSize(leftPanel.props.defaultSize);
    }
  }, [leftPanel?.props.defaultSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      const newLeftSize = (mouseX / containerWidth) * 100;

      const leftMinSize = leftPanel?.props.minSize ?? 10;
      const rightMinSize = rightPanel?.props.minSize ?? 10;
      const maxLeftSize = 100 - rightMinSize;

      const constrainedSize = Math.max(leftMinSize, Math.min(maxLeftSize, newLeftSize));
      setLeftPanelSize(constrainedSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, leftPanel?.props.minSize, rightPanel?.props.minSize]);

  const rightPanelSize = 100 - leftPanelSize;

  return (
    <div ref={containerRef} className={`flex h-full w-full ${className}`}>
      <div 
        style={{ width: `${leftPanelSize}%` }} 
        className={`h-full ${leftPanel?.props.className || ""}`}
      >
        {leftPanel?.props.children}
      </div>

      <div
        className={`w-1 bg-[var(--color-border)] hover:bg-[var(--color-primary-medium)] cursor-col-resize transition-colors relative h-full flex-shrink-0 ${
          splitter?.props.className || ""
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 -inset-x-1 flex items-center justify-center">
          <div className="w-1 h-8 bg-[var(--color-primary-medium)] rounded-full opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div 
        style={{ width: `${rightPanelSize}%` }} 
        className={`h-full ${rightPanel?.props.className || ""}`}
      >
        {rightPanel?.props.children}
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: PanelProps) {
  return <div className={`h-full ${className}`}>{children}</div>;
}

function Splitter({ className = "" }: SplitterProps) {
  return <div className={className} />;
}

ResizableLayout.Panel = Panel;
ResizableLayout.Splitter = Splitter;