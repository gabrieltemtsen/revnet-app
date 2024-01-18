"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import apolloClient from "@/lib/apolloClient";
import { wagmiConfig } from "@/lib/wagmiConfig";
import { ApolloProvider } from "@apollo/client";
import { ConnectKitProvider } from "connectkit";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { WagmiConfig } from "wagmi";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <WagmiConfig config={wagmiConfig}>
      <ConnectKitProvider>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={200} skipDelayDuration={100}>
              {mounted && children}
            </TooltipProvider>
          </QueryClientProvider>
        </ApolloProvider>
      </ConnectKitProvider>
    </WagmiConfig>
  );
}
