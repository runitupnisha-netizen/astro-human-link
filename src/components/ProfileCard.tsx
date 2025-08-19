import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Star, User } from "lucide-react";

interface ProfileCardProps {
  name: string;
  age: number;
  zodiacSign: string;
  humanDesignType: string;
  compatibility: number;
  location: string;
  avatar?: string;
}

const ProfileCard = ({ 
  name, 
  age, 
  zodiacSign, 
  humanDesignType, 
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

        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="bg-secondary/50">
            <Star className="w-3 h-3 mr-1" />
            {zodiacSign}
          </Badge>
          <Badge variant="outline" className="border-accent/30 text-accent">
            {humanDesignType}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 border-border hover:bg-secondary/20">
            View Profile
          </Button>
          <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 shadow-glow">
            <Heart className="w-4 h-4 mr-1" />
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;