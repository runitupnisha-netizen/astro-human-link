import { ReactNode } from "react";

const PageTransition = ({ children }: { children: ReactNode }) => (
  <div className="w-full">
    {children}
  </div>
);

export default PageTransition;
