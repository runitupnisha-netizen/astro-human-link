import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Heart, Star, Sparkles } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState(0);
  const [newMessage, setNewMessage] = useState("");

  const conversations = [
    {
      name: "Luna",
      lastMessage: "I love how your Mars in Taurus grounds my Pisces energy 💫",
      time: "2m ago",
      unread: 2,
      compatibility: 94,
      isOnline: true
    },
    {
      name: "River", 
      lastMessage: "Want to explore that Venus-Neptune aspect we talked about?",
      time: "1h ago",
      unread: 0,
      compatibility: 91,
      isOnline: false
    },
    {
      name: "Aurora",
      lastMessage: "Your Gene Key 64 really resonates with my journey ✨",
      time: "3h ago",
      unread: 1,
      compatibility: 78,
      isOnline: true
    }
  ];

  const messages = [
    {
      sender: "Luna",
      message: "Hi there! I noticed we have such beautiful chart synastry 🌙",
      time: "10:30 AM",
      isOwn: false
    },
    {
      sender: "You",
      message: "Yes! Your Cancer moon with my Pisces sun feels so harmonious",
      time: "10:32 AM", 
      isOwn: true
    },
    {
      sender: "Luna",
      message: "I love how your Mars in Taurus grounds my Pisces energy 💫",
      time: "10:35 AM",
      isOwn: false
    },
    {
      sender: "Luna",
      message: "Would you like to dive deeper into our composite chart?",
      time: "10:36 AM",
      isOwn: false
    }
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Would handle sending message here
      setNewMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      
      <div className="relative z-10 pt-20 pb-4">
        <div className="max-w-6xl mx-auto px-6 h-[calc(100vh-6rem)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            
            {/* Conversations List */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 lg:col-span-1">
              <CardContent className="p-0 h-full">
                <div className="p-4 border-b border-border">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Soul Messages
                  </h2>
                </div>
                
                <div className="overflow-y-auto h-[calc(100%-5rem)]">
                  {conversations.map((conversation, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedChat(index)}
                      className={`p-4 cursor-pointer transition-colors border-b border-border/50 hover:bg-secondary/20 ${
                        selectedChat === index ? 'bg-secondary/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-mystical flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-foreground" />
                          </div>
                          {conversation.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-foreground truncate">{conversation.name}</h3>
                            <div className="flex items-center gap-2">
                              {conversation.unread > 0 && (
                                <Badge className="bg-primary text-primary-foreground text-xs">
                                  {conversation.unread}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{conversation.time}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs border-accent/30 text-accent">
                              {conversation.compatibility}% Match
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/50 lg:col-span-2">
              <CardContent className="p-0 h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-mystical flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{conversations[selectedChat].name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-accent/30 text-accent">
                        {conversations[selectedChat].compatibility}% Cosmic Match
                      </Badge>
                      {conversations[selectedChat].isOnline && (
                        <span className="text-xs text-green-500">● Online</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-primary/30">
                    <Star className="w-4 h-4 mr-1" />
                    View Charts
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.isOwn
                            ? 'bg-primary text-primary-foreground ml-4'
                            : 'bg-secondary/50 text-foreground mr-4'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <span className="text-xs opacity-70 mt-1 block">{message.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Share your cosmic thoughts..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 bg-background/50 border-border"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleSendMessage}
                      className="bg-primary hover:bg-primary/90 shadow-glow"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="text-xs border-accent/30">
                      <Heart className="w-3 h-3 mr-1" />
                      Send Love
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs border-primary/30">
                      <Star className="w-3 h-3 mr-1" />
                      Share Chart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;