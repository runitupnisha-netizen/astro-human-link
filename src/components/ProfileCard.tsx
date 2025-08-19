import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, User } from "lucide-react";

interface ProfileCardProps {
  name: string;
  age: number;
  zodiacSign: string;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  venusHouse: number;
  marsAspect: string;
  humanDesignType: string;
  geneKey: {
    number: number;
    name: string;
    gift: string;
  };
  compatibility: number;
  location: string;
  avatar?: string;
}

const ProfileCard = ({ 
  name, 
  age, 
  zodiacSign,
  sunSign,
  moonSign, 
  risingSign,
  venusHouse,
  marsAspect,
  humanDesignType,
  geneKey,
  compatibility, 
  location 
}: ProfileCardProps) => {
  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return "bg-gradient-golden";
    if (score >= 60) return "bg-gradient-aurora"; 
    return "bg-gradient-mystical";
  };

  return (
    <Card className="group hover:shadow-glow transition-all duration-500 border-border/50 backdrop-blur-sm bg-card/80">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
            <User className="w-8 h-8 text-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-foreground">{name}, {age}</h3>
            <p className="text-muted-foreground">{location}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium text-foreground ${getCompatibilityColor(compatibility)}`}>
            {compatibility}% Match
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-secondary/50 text-xs">
              <Star className="w-3 h-3 mr-1" />
              {sunSign} ☽ {moonSign} ↗ {risingSign}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-accent/30 text-accent text-xs">
              ♀ {venusHouse}H • {marsAspect}
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              {humanDesignType}
            </Badge>
          </div>

          <div className="bg-gradient-mystical/20 rounded-lg p-2 border border-accent/20">
            <div className="text-xs text-accent font-medium">Gene Key {geneKey.number}: {geneKey.name}</div>
            <div className="text-xs text-muted-foreground mt-1">Gift: {geneKey.gift}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 border-border hover:bg-secondary/20">
            Deep Dive
          </Button>
          <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 shadow-glow">
            <Heart className="w-4 h-4 mr-1" />
            Soul Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;