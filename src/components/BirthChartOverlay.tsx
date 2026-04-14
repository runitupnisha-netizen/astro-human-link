import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SynastryChart from "@/components/SynastryChart";

interface BirthChartOverlayProps {
  open: boolean;
  onClose: () => void;
  mySigns: { sun: string | null; moon: string | null; rising: string | null };
  theirSigns: { sun: string | null; moon: string | null; rising: string | null };
  theirName: string;
  score: number;
}

const BirthChartOverlay = ({ open, onClose, mySigns, theirSigns, theirName, score }: BirthChartOverlayProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-center">
            ✨ Synastry with {theirName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <SynastryChart mySigns={mySigns} theirSigns={theirSigns} score={score} />
        </div>
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            <span className="text-accent">You:</span> ☉ {mySigns.sun || "?"} · ☽ {mySigns.moon || "?"} · ↗ {mySigns.rising || "?"}
          </p>
          <p>
            <span className="text-primary">Them:</span> ☉ {theirSigns.sun || "?"} · ☽ {theirSigns.moon || "?"} · ↗ {theirSigns.rising || "?"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BirthChartOverlay;
