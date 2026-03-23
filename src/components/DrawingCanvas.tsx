import { useRef, useEffect, useState, useCallback } from 'react'

interface Props {
  width?: number
  height?: number
  onStroke?: (imageData: ImageData) => void
  onClear?: () => void
  className?: string
}

export default function DrawingCanvas({ width = 300, height = 300, onStroke, onClear, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    return ctx
  }, [])

  useEffect(() => {
    const ctx = getCtx()
    if (!ctx) return
    ctx.fillStyle = '#1e1b2e'
    ctx.fillRect(0, 0, width, height)
    // Draw grid
    ctx.strokeStyle = '#363252'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    ctx.setLineDash([])
  }, [width, height, getCtx])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    lastPointRef.current = getPos(e)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !lastPointRef.current) return
    const ctx = getCtx()
    if (!ctx) return
    const pos = getPos(e)
    ctx.strokeStyle = '#e2e0ef'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPointRef.current = pos
  }

  const stopDrawing = () => {
    if (isDrawing && onStroke) {
      const ctx = getCtx()
      if (ctx) onStroke(ctx.getImageData(0, 0, width, height))
    }
    setIsDrawing(false)
    lastPointRef.current = null
  }

  const clear = () => {
    const ctx = getCtx()
    if (!ctx) return
    ctx.fillStyle = '#1e1b2e'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#363252'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    ctx.setLineDash([])
    onClear?.()
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-surface-lighter rounded-xl cursor-crosshair touch-none"
        style={{ width: Math.min(width, 280), height: Math.min(height, 280) }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <button
        onClick={clear}
        className="px-4 py-2 bg-surface-lighter rounded-lg text-text-muted hover:text-text transition-colors text-sm"
      >
        Clear
      </button>
    </div>
  )
}
