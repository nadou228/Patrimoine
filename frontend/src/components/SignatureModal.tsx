import React, { useRef, useState, useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (dataUrl: string, name: string) => void;
};

const SignatureModal: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = 600;
      const h = 200;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [open]);

  const getCtx = () => canvasRef.current?.getContext('2d');

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl, name || '');
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#fff', padding: 16, width: 680, borderRadius: 6 }}>
        <h3>Signer le document</h3>
        <div style={{ marginBottom: 8 }}>
          <input placeholder="Nom du validateur" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ border: '1px solid #ddd', marginBottom: 8 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
            style={{ display: 'block', width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={clear} className="btn">Effacer</button>
          <button onClick={onClose} className="btn btn-secondary">Annuler</button>
          <button onClick={confirm} className="btn btn-primary">Valider & Générer PDF</button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
