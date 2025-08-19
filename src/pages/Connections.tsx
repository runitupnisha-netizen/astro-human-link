import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Star, Clock, Sparkles } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";

const Connections = () => {
  const connections = [
    {
      name: "Luna",
      age: 28,
      compatibility: 94,
      status: "matched",
      lastActive: "2h ago",
      connectionType: "Soul Mate Potential",
      sharedAspects: ["♀ ⚹ ♀", "☽ △ ☽", "♃ ☌ ♀"],
      message: "Your Venus-Neptune connection suggests deep spiritual intimacy..."
    },
    {
      name: "River",
      age: 27,
      compatibility: 91,
      status: "liked",
      lastActive: "1d ago",
      connectionType: "Twin Flame Resonance",
      sharedAspects: ["☉ ☌ ☽", "♂ ⚹ ♀", "♆ △ ♆"],
      message: "Both Manifestors - powerful creative energy when combined"
    },
    {
      name: "Phoenix",
      age: 30,
      compatibility: 82,
      status: "viewing",
      lastActive: "5h ago",
      connectionType: "Karmic Connection",
      sharedAspects: ["♄ □ ♄", "♀ ☍ ♂", "☽ ⚺ ☉"],
      message: "Challenging aspects that promote growth and transformation"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "matched": return "bg-gradient-golden";
      case "liked": return "bg-gradient-aurora";
      case "viewing": return "bg-gradient-mystical";
      default: return "bg-secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "matched": return "Mutual Connection";
      case "liked": return "You Connected";
      case "viewing": return "Viewed Your Profile";
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-aurora bg-clip-text text-transparent">
              Your Soul Connections
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              These are the souls who've resonated with your cosmic signature. Each connection reveals a unique tapestry of planetary harmony.
            </p>
          </div>

          <div className="grid gap-6">
            {connections.map((connection, index) => (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-glow transition-all duration-500">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
                      <Sparkles className="w-10 h-10 text-foreground" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-2xl font-semibold text-foreground">{connection.name}, {connection.age}</h3>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium text-foreground ${getStatusColor(connection.status)}`}>
                          {connection.compatibility}% Match
                        </div>
                        <Badge variant="outline" className="border-accent/30 text-accent">
                          {getStatusText(connection.status)}
                        </Badge>
                      </div>

                      <div className="mb-4">
                        <Badge className="bg-gradient-aurora/20 text-primary border-primary/30 mb-2">
                          {connection.connectionType}
                        </Badge>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {connection.message}
                        </p>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2 text-accent">Cosmic Resonances</h4>
                        <div className="flex flex-wrap gap-2">
                          {connection.sharedAspects.map((aspect, aspectIndex) => (
                            <Badge key={aspectIndex} variant="secondary" className="bg-secondary/50 text-xs">
                              {aspect}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          Active {connection.lastActive}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="border-border hover:bg-secondary/20">
                            <Star className="w-4 h-4 mr-1" />
                            View Charts
                          </Button>
                          {connection.status === "matched" ? (
                            <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-glow">
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Message
                            </Button>
                          ) : (
                            <Button size="sm" className="bg-gradient-aurora hover:opacity-90">
                              <Heart className="w-4 h-4 mr-1" />
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Want to see more potential connections?
            </p>
            <Button size="lg" className="bg-gradient-mystical hover:opacity-90 shadow-glow">
              <Star className="w-5 h-5 mr-2" />
              Expand Your Circle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;