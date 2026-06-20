import { Link } from "react-router-dom";

const Footer = () => (
  <footer
    className="relative z-10 border-t border-border/30 bg-background/80 backdrop-blur-sm mt-16"
    style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
  >
    <div className="max-w-4xl mx-auto px-6 pt-10 pb-2 md:pb-10 space-y-6">
      <p className="text-center font-display text-sm md:text-base bg-gradient-golden bg-clip-text text-transparent">
        Self-discovery first. Connection follows.
      </p>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
          Privacy Policy
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
          Terms of Service
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <Link to="/disclaimer" className="text-muted-foreground hover:text-primary transition-colors">
          Disclaimer
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <Link to="/safety" className="text-muted-foreground hover:text-primary transition-colors">
          Safety Center
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
          Contact
        </Link>
      </div>

      <div className="text-center space-y-4 text-xs text-muted-foreground/70 leading-relaxed max-w-3xl mx-auto">
        <p className="font-semibold text-muted-foreground text-sm">
          © 2026 RunItUp Media Group LLC. All rights reserved.
        </p>
        <p>
          Stellara is a product of RunItUp Media Group LLC. All related content, features, functionality, software, algorithms, designs,
          user interfaces, graphics, text, branding, trademarks, service marks, and intellectual
          property are the exclusive property of RunItUp Media Group LLC and are protected by United States and
          international copyright, trademark, trade secret, and other intellectual property laws.
        </p>
        <p>
          The content, design, software, algorithms, and proprietary systems of this application are
          confidential and proprietary. Any unauthorized access, reproduction, modification,
          distribution, reverse engineering, scraping, duplication, or exploitation of any portion of
          this platform without prior written permission is strictly prohibited and may result in
          civil and/or criminal penalties under applicable law.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
