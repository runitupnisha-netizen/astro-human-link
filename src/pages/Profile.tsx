import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Star, Heart, Edit, MapPin, Calendar, Sparkles } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";

const Profile = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Profile Header */}
          <Card className="mb-8 bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-32 h-32 rounded-full bg-gradient-mystical flex items-center justify-center shadow-mystical">
                  <Sparkles className="w-16 h-16 text-foreground" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">Your Cosmic Blueprint</h1>
                    <Button variant="outline" size="sm" className="border-accent/30">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>San Francisco, CA</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>March 15, 1995</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-gradient-golden text-background">95% Profile Complete</Badge>
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      Looking for Deep Connection
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Astrological Profile */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent" />
                  Your Celestial Signature
                </h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">☉</div>
                      <div className="text-sm text-muted-foreground">Sun</div>
                      <div className="font-medium">Pisces</div>
                      <div className="text-xs text-muted-foreground">12th House</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">☽</div>
                      <div className="text-sm text-muted-foreground">Moon</div>
                      <div className="font-medium">Cancer</div>
                      <div className="text-xs text-muted-foreground">4th House</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">↗</div>
                      <div className="text-sm text-muted-foreground">Rising</div>
                      <div className="font-medium">Scorpio</div>
                      <div className="text-xs text-muted-foreground">1st House</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm">Personal Planets</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">♀ Venus:</span>
                        <span>Aquarius 7H</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">♂ Mars:</span>
                        <span>Taurus 2H</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">☿ Mercury:</span>
                        <span>Pisces 12H</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">♃ Jupiter:</span>
                        <span>Sagittarius 9H</span>
                      </div>
                    </div>
                  </div>

                  <Separator />
                  
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Key Aspects</h3>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">♀ ⚹ ♆</span>
                        <span>Venus Sextile Neptune</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">☽ △ ♃</span>
                        <span>Moon Trine Jupiter</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">☉ ☌ ☿</span>
                        <span>Sun Conjunct Mercury</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Human Design & Gene Keys */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Your Energetic Blueprint
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Human Design</h3>
                    <div className="bg-gradient-mystical/20 rounded-lg p-4 border border-primary/20">
                      <div className="text-lg font-semibold text-primary mb-2">Manifestor</div>
                      <p className="text-sm text-muted-foreground mb-3">
                        You are here to initiate and create. Your aura naturally moves energy and gets things started.
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Strategy:</span>
                          <div className="font-medium">Inform & Initiate</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Authority:</span>
                          <div className="font-medium">Emotional</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Primary Gene Key</h3>
                    <div className="bg-gradient-aurora/20 rounded-lg p-4 border border-accent/20">
                      <div className="text-lg font-semibold text-accent mb-2">Gene Key 64: Confusion</div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Shadow:</span>
                          <span className="ml-2">Confusion</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gift:</span>
                          <span className="ml-2">Imagination</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Siddhi:</span>
                          <span className="ml-2">Illumination</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Activation Progress</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Self-Awareness</span>
                          <span>85%</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Emotional Intelligence</span>
                          <span>72%</span>
                        </div>
                        <Progress value={72} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Spiritual Connection</span>
                          <span>91%</span>
                        </div>
                        <Progress value={91} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connection Preferences */}
          <Card className="mt-8 bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-accent" />
                Your Soul Connection Preferences
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Seeking</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Deep Emotional Connection</Badge>
                    <Badge variant="secondary">Spiritual Growth Partner</Badge>
                    <Badge variant="secondary">Creative Collaboration</Badge>
                    <Badge variant="secondary">Sacred Union</Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Compatibility Factors</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Water Sign Energy:</span>
                      <span>High Priority</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Generator/Manifestor:</span>
                      <span>Preferred</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Venus Harmony:</span>
                      <span>Essential</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;