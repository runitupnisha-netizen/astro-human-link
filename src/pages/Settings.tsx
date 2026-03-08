import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Bell, Heart, Shield, Star, Moon, Sun, Smartphone } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

const Settings = () => {
  const { isSupported, permission, subscribe } = usePushNotifications();

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Push notifications enabled ✨");
    } else if (permission === "denied") {
      toast.error("Notifications are blocked in your browser settings");
    } else {
      toast.error("Could not enable push notifications");
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      
      <div className="relative z-10 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-aurora bg-clip-text text-transparent">
              Settings & Preferences
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Customize your cosmic journey and connection preferences
            </p>
          </div>

          <div className="grid gap-6">
            {/* Account Settings */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue="cosmic.soul@example.com" className="bg-background/50" />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" defaultValue="San Francisco, CA" className="bg-background/50" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="birthdate">Birth Date</Label>
                    <Input id="birthdate" type="date" defaultValue="1995-03-15" className="bg-background/50" />
                  </div>
                  <div>
                    <Label htmlFor="birthtime">Birth Time</Label>
                    <Input id="birthtime" type="time" defaultValue="14:30" className="bg-background/50" />
                  </div>
                  <div>
                    <Label htmlFor="birthplace">Birth Place</Label>
                    <Input id="birthplace" defaultValue="San Francisco, CA" className="bg-background/50" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Preferences */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-accent" />
                  Connection Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Seeking Connection Type</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className="bg-primary/20 text-primary cursor-pointer">Soul Mate</Badge>
                    <Badge variant="outline" className="cursor-pointer">Twin Flame</Badge>
                    <Badge variant="outline" className="cursor-pointer">Life Partner</Badge>
                    <Badge variant="outline" className="cursor-pointer">Spiritual Friend</Badge>
                    <Badge className="bg-accent/20 text-accent cursor-pointer">Sacred Union</Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium mb-3 block">Age Range</Label>
                    <div className="flex items-center gap-2">
                      <Input defaultValue="25" className="bg-background/50" />
                      <span className="text-muted-foreground">to</span>
                      <Input defaultValue="35" className="bg-background/50" />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium mb-3 block">Distance</Label>
                    <Input defaultValue="50 miles" className="bg-background/50" />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Astrological Preferences</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Water Sign Priority</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Compatible Rising Signs</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Venus Harmony</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Moon Phase Alignment</span>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Human Design Preferences</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className="bg-primary/20 text-primary cursor-pointer">Generator</Badge>
                    <Badge className="bg-accent/20 text-accent cursor-pointer">Manifestor</Badge>
                    <Badge variant="outline" className="cursor-pointer">Projector</Badge>
                    <Badge variant="outline" className="cursor-pointer">Reflector</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">New Connections</span>
                    <p className="text-sm text-muted-foreground">When someone connects with you</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Messages</span>
                    <p className="text-sm text-muted-foreground">New message notifications</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Cosmic Events</span>
                    <p className="text-sm text-muted-foreground">New moons, retrogrades, and astrological events</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Profile Views</span>
                    <p className="text-sm text-muted-foreground">When someone views your profile</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                {/* Push Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Smartphone className="w-4 h-4" /> Browser Push Notifications
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {!isSupported
                        ? "Not supported in this browser"
                        : permission === "granted"
                        ? "Enabled — you'll receive daily cosmic intentions"
                        : permission === "denied"
                        ? "Blocked — update in browser settings"
                        : "Get daily intentions even when the app is closed"}
                    </p>
                  </div>
                  {isSupported && permission !== "granted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnablePush}
                      className="border-primary/30 text-primary hover:bg-primary/10"
                    >
                      Enable
                    </Button>
                  )}
                  {permission === "granted" && (
                    <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Show Birth Chart</span>
                    <p className="text-sm text-muted-foreground">Allow others to see your detailed birth chart</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Location Visibility</span>
                    <p className="text-sm text-muted-foreground">Show approximate location</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">Online Status</span>
                    <p className="text-sm text-muted-foreground">Show when you're active</p>
                  </div>
                  <Switch />
                </div>
                
                <Separator />
                
                <div className="flex gap-2">
                  <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                    Delete Account
                  </Button>
                  <Button variant="outline">Export Data</Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 glow-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent" />
                  Theme & Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium mb-3 block">Color Theme</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-primary/30">
                      <Moon className="w-4 h-4 mr-2" />
                      Dark Mode
                    </Button>
                    <Button variant="outline">
                      <Sun className="w-4 h-4 mr-2" />
                      Light Mode
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center pt-6">
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-glow btn-shimmer">
                Save All Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;