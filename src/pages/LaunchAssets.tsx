import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import appIcon from "@/assets/stellara-icon-constellation-heart.png";
import screenshotDiscover from "@/assets/screenshot-1-discover.jpg";
import screenshotCompatibility from "@/assets/screenshot-2-compatibility.jpg";
import screenshotMessages from "@/assets/screenshot-3-messages.jpg";

const assetGroups = [
  {
    title: "App Icon",
    description: "Constellation heart concept for the App Store icon.",
    items: [
      {
        name: "Constellation Heart",
        src: appIcon,
        alt: "Stellara constellation heart app icon with subtle glow",
      },
    ],
  },
  {
    title: "App Store Screenshots",
    description: "Current launch-ready screenshot directions in one place.",
    items: [
      {
        name: "Discover",
        src: screenshotDiscover,
        alt: "Discover screen screenshot",
      },
      {
        name: "Compatibility",
        src: screenshotCompatibility,
        alt: "Compatibility screen screenshot",
      },
      {
        name: "Messages",
        src: screenshotMessages,
        alt: "Messages screen screenshot",
      },
    ],
  },
];

const LaunchAssets = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Launch Preview
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Stellara App Store Assets</h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            Review the icon and screenshots directly in the preview window.
          </p>
        </header>

        {assetGroups.map((group) => (
          <section key={group.title} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">{group.title}</h2>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <Card key={item.name} className="overflow-hidden border-border/70 bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">{item.name}</CardTitle>
                    <CardDescription>{item.alt}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                      <img
                        src={item.src}
                        alt={item.alt}
                        loading="lazy"
                        className="h-auto w-full object-cover"
                      />
                    </div>
                    <Button asChild variant="secondary" className="w-full">
                      <a href={item.src} target="_blank" rel="noreferrer">
                        Open full size
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};

export default LaunchAssets;