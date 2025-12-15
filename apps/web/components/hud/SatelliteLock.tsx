import { useEffect, useRef, useState } from 'react';
import { CityAccent, CITY_COLORS } from './types';

interface SatelliteLockProps {
  cityName: string;
  cityCode: string;
  coordinates: { lat: number; lon: number };
  cityAccent?: CityAccent;
  localTime?: Date;
  mode?: 'NIGHT' | 'DAY';
  className?: string;
}

/**
 * SatelliteLock: Hero header component with rotating wireframe mesh
 *
 * Purpose: Orientation + awe + credibility
 * This is the "satellite locking onto target" moment before field deployment.
 */
export default function SatelliteLock({
  cityName,
  cityCode,
  coordinates,
  cityAccent = 'default',
  localTime = new Date(),
  mode = 'NIGHT',
  className = '',
}: SatelliteLockProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [time, setTime] = useState(localTime);
  const [gyro, setGyro] = useState({ x: 0, y: 0 });
  const colors = CITY_COLORS[cityAccent];

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Gyroscope / mouse parallax
  useEffect(() => {
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        setGyro({
          x: Math.max(-30, Math.min(30, e.gamma)) / 30,
          y: Math.max(-30, Math.min(30, e.beta - 45)) / 30,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setGyro({ x, y });
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Wireframe mesh animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let rotation = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2); // Cap for battery
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Low-poly city mesh vertices (simplified skyline)
    const generateMesh = () => {
      const points: { x: number; y: number; z: number }[] = [];
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Create a simple cityscape outline
      for (let i = 0; i < 20; i++) {
        const x = (i / 19) * w * 0.8 + w * 0.1;
        const height = Math.random() * h * 0.4 + h * 0.1;
        const z = Math.random() * 50 - 25;

        points.push({ x, y: h * 0.7 - height, z });
        points.push({ x, y: h * 0.7, z });
      }

      // Add grid floor
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
          points.push({
            x: w * 0.1 + (i / 9) * w * 0.8,
            y: h * 0.7 + j * 10,
            z: -j * 20,
          });
        }
      }

      return points;
    };

    const mesh = generateMesh();

    const render = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;

      // Apply gyroscope + rotation transform
      const rotX = gyro.y * 0.1;
      const rotY = rotation + gyro.x * 0.3;

      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;

      // Project and draw points
      const projected = mesh.map((p) => {
        // Simple 3D rotation
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);

        const x1 = (p.x - cx) * cosY - p.z * sinY;
        const z1 = (p.x - cx) * sinY + p.z * cosY;
        const y1 = (p.y - cy) * cosX - z1 * sinX;
        const z2 = (p.y - cy) * sinX + z1 * cosX;

        // Perspective projection
        const scale = 400 / (400 + z2);
        return {
          x: cx + x1 * scale,
          y: cy + y1 * scale,
          z: z2,
        };
      });

      // Draw wireframe connections
      ctx.beginPath();
      for (let i = 0; i < projected.length - 1; i++) {
        const p1 = projected[i];
        const p2 = projected[i + 1];

        if (Math.abs(p1.x - p2.x) < 100 && Math.abs(p1.y - p2.y) < 150) {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
      }
      ctx.stroke();

      // Draw vertices with glow
      ctx.fillStyle = colors.primary;
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 4;
      projected.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Slow rotation (battery friendly)
      rotation += 0.002;
      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, [colors, gyro]);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCoord = (val: number, pos: 'N' | 'S' | 'E' | 'W', neg: 'N' | 'S' | 'E' | 'W') => {
    const absVal = Math.abs(val);
    const dir = val >= 0 ? pos : neg;
    return `${absVal.toFixed(4)}° ${dir}`;
  };

  const hour = time.getHours();
  const opsMode = hour >= 6 && hour < 18 ? 'DAY OPS' : 'NIGHT OPS';

  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ minHeight: '320px' }}>
      {/* Wireframe Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ filter: mode === 'DAY' ? 'invert(1) hue-rotate(180deg)' : 'none' }}
      />

      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none scan-line opacity-30" />

      {/* Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(${colors.primary}20 1px, transparent 1px),
            linear-gradient(90deg, ${colors.primary}20 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Data Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-8">
        {/* Top Left: Target Lock */}
        <div className="space-y-1">
          <div
            className="font-mono text-xs tracking-[0.3em] opacity-70"
            style={{ color: colors.primary }}
          >
            TARGET ACQUIRED
          </div>
          <h1
            className="font-mono text-4xl md:text-5xl lg:text-6xl font-bold tracking-wider"
            style={{
              color: colors.primary,
              textShadow: `0 0 30px ${colors.glow}`,
            }}
          >
            {cityName.toUpperCase()}
          </h1>
          <div
            className="font-mono text-sm tracking-widest opacity-60"
            style={{ color: colors.primary }}
          >
            {cityCode} {/* separator */} {opsMode}
          </div>
        </div>

        {/* Bottom: Coordinates & Time */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div className="font-mono text-xs md:text-sm space-y-1" style={{ color: colors.primary }}>
            <div className="opacity-70">COORDS</div>
            <div className="tracking-wider">
              {formatCoord(coordinates.lat, 'N', 'S')}, {formatCoord(coordinates.lon, 'E', 'W')}
            </div>
          </div>

          <div className="font-mono text-right space-y-1" style={{ color: colors.primary }}>
            <div className="text-xs opacity-70 tracking-widest">LOCAL TIME</div>
            <div
              className="text-2xl md:text-3xl tracking-[0.2em] tabular-nums"
              style={{ textShadow: `0 0 20px ${colors.glow}` }}
            >
              {formatTime(time)}
            </div>
          </div>
        </div>
      </div>

      {/* Corner Brackets */}
      <div
        className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2"
        style={{ borderColor: colors.primary }}
      />
      <div
        className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2"
        style={{ borderColor: colors.primary }}
      />
      <div
        className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2"
        style={{ borderColor: colors.primary }}
      />
      <div
        className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2"
        style={{ borderColor: colors.primary }}
      />

      {/* Bottom Glow Line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
          boxShadow: `0 0 20px ${colors.glow}`,
        }}
      />
    </div>
  );
}
