import { useEffect, useRef, useState } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Big3 = {
  sun: string | null;
  moon: string | null;
  rising: string | null;
};

type Props = {
  code: string;
  big3: Big3;
  /** Full deep link, e.g. https://stellara.app/join/ABC123 */
  shareUrl: string;
};

/**
 * Renders an 1080x1350 share card on a hidden canvas, then offers
 * native share / download. Used by the Referral page.
 *
 * Background: #0c0b13 with subtle stars.
 * Stellara sparkle mark, user's Big 3, headline, code in #d0b4f7,
 * "stellara.app" footer.
 */
const W = 1080;
const H = 1350;

const drawCard = (
  ctx: CanvasRenderingContext2D,
  code: string,
  big3: Big3,
) => {
  // Background
  ctx.fillStyle = "#0c0b13";
  ctx.fillRect(0, 0, W, H);

  // Subtle radial vignette of stars (deterministic)
  const rng = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };
  const rand = rng(42);
  for (let i = 0; i < 220; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = rand() * 1.6 + 0.3;
    const a = rand() * 0.6 + 0.15;
    ctx.fillStyle = `rgba(208, 180, 247, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faint center glow
  const grad = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 700);
  grad.addColorStop(0, "rgba(139, 92, 246, 0.18)");
  grad.addColorStop(1, "rgba(12, 11, 19, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Stellara sparkle mark (drawn — no asset dependency)
  const cx = W / 2;
  const sparkleY = 200;
  ctx.save();
  ctx.translate(cx, sparkleY);
  ctx.fillStyle = "#d0b4f7";
  // 4-point sparkle
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(10, -10);
  ctx.lineTo(42, 0);
  ctx.lineTo(10, 10);
  ctx.lineTo(0, 42);
  ctx.lineTo(-10, 10);
  ctx.lineTo(-42, 0);
  ctx.lineTo(-10, -10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Stellara wordmark
  ctx.fillStyle = "#e0d4ff";
  ctx.textAlign = "center";
  ctx.font = "600 56px 'Lora', Georgia, serif";
  ctx.fillText("Stellara", cx, sparkleY + 110);

  // Big 3
  const big3Line = [
    big3.sun ? `☉ ${big3.sun}` : null,
    big3.moon ? `☽ ${big3.moon}` : null,
    big3.rising ? `↑ ${big3.rising}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillStyle = "rgba(224, 212, 255, 0.75)";
  ctx.font = "400 32px 'Inter', system-ui, sans-serif";
  ctx.fillText(big3Line || "Your cosmic blueprint", cx, sparkleY + 180);

  // Headline
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 64px 'Lora', Georgia, serif";
  ctx.fillText("Join me on Stellara ✦", cx, 720);

  // Sub
  ctx.fillStyle = "rgba(224, 212, 255, 0.7)";
  ctx.font = "400 28px 'Inter', system-ui, sans-serif";
  ctx.fillText("We both get a free month of Pro", cx, 770);

  // Code box
  const boxW = 680;
  const boxH = 200;
  const boxX = (W - boxW) / 2;
  const boxY = 850;
  ctx.strokeStyle = "rgba(208, 180, 247, 0.35)";
  ctx.lineWidth = 2;
  // Rounded rect
  const r = 24;
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxW - r, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  ctx.lineTo(boxX + boxW, boxY + boxH - r);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  ctx.lineTo(boxX + r, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fillStyle = "rgba(208, 180, 247, 0.06)";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(224, 212, 255, 0.55)";
  ctx.font = "500 22px 'Inter', system-ui, sans-serif";
  ctx.fillText("YOUR CODE", cx, boxY + 60);

  ctx.fillStyle = "#d0b4f7";
  ctx.font = "700 92px 'Lora', Georgia, serif";
  ctx.fillText(code, cx, boxY + 160);

  // Footer
  ctx.fillStyle = "rgba(224, 212, 255, 0.5)";
  ctx.font = "400 26px 'Inter', system-ui, sans-serif";
  ctx.fillText("stellara.app", cx, H - 80);
};

const ReferralShareCard = ({ code, big3, shareUrl }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCard(ctx, code, big3);
    setPreviewUrl(canvas.toDataURL("image/png"));
  }, [code, big3.sun, big3.moon, big3.rising]);

  const buildBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((b) => resolve(b), "image/png", 0.95);
    });

  const message = `I've been using Stellara — it's like having a cosmic guide for my love life. Use my code ${code} and we both get a free month of Pro. ✦ ${shareUrl}`;

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await buildBlob();
      const file = blob ? new File([blob], `stellara-${code}.png`, { type: "image/png" }) : null;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (file && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          title: "Join me on Stellara ✦",
          text: message,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "Join me on Stellara ✦",
          text: message,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(message);
        toast.success("Invite message copied ✦");
      }
    } catch (err) {
      const e = err as { name?: string };
      if (e?.name !== "AbortError") {
        await navigator.clipboard.writeText(message).catch(() => {});
        toast.success("Invite message copied ✦");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    const blob = await buildBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stellara-invite-${code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Card saved ✦");
  };

  return (
    <div className="space-y-3">
      {/* Hidden render canvas */}
      <canvas ref={canvasRef} width={W} height={H} className="hidden" aria-hidden="true" />
      {previewUrl ? (
        <div className="rounded-2xl overflow-hidden border border-[#d0b4f7]/20 bg-[#0c0b13]">
          <img
            src={previewUrl}
            alt={`Stellara invite card with code ${code}`}
            className="w-full h-auto block"
          />
        </div>
      ) : (
        <div className="aspect-[4/5] rounded-2xl bg-[#0c0b13] border border-[#d0b4f7]/20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#d0b4f7] animate-spin" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleShare}
          disabled={busy}
          className="rounded-full"
          style={{ background: "#6d28d9", color: "white" }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          {busy ? "Sharing…" : "Share card"}
        </Button>
        <Button onClick={handleDownload} variant="outline" className="rounded-full border-[#d0b4f7]/30">
          <Download className="w-4 h-4 mr-2" />
          Save image
        </Button>
      </div>
    </div>
  );
};

export default ReferralShareCard;