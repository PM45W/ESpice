import React, { useEffect, useMemo, useState } from 'react';
import EnhancedGraphViewer from '../components/EnhancedGraphViewer';

export default function GraphExtractionResultPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('graphExtractionResult');
      if (!raw) return;
      const data = JSON.parse(raw);
      setPayload(data);
      setImageSrc(data?.imagePreview || null);
    } catch (e) {
      console.error('Failed to load result payload', e);
    }
  }, []);

  if (!payload) {
    return <div className="p-4">No result data found. Please run extraction first.</div>;
  }

  return (
    <div className="p-4 max-w-[1280px] mx-auto">
      <div className="grid grid-cols-2 gap-4 items-start">
        <div>
          <div className="mb-2 text-sm text-muted-foreground">Original Graph</div>
          <div style={{
            width: 583,
            height: 471,
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'hsl(var(--muted) / 0.06)'
          }}>
            {imageSrc ? (
              <img src={imageSrc} alt="Original graph" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div className="text-sm text-muted-foreground">No image</div>
            )}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm text-muted-foreground">Extracted Curves</div>
          <EnhancedGraphViewer
            curves={payload?.result?.curves || []}
            config={payload?.config}
            title=""
            width={583}
            height={471}
            showGrid={true}
            showLegend={true}
            showAxisLabels={true}
            showTitle={false}
          />
        </div>
      </div>
    </div>
  );
}


