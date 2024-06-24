import { Nav } from "@/components/layout/Nav";
import { JBChainId } from "juice-sdk-react/dist/contexts/JBChainContext/JBChainContext";
import { optimismSepolia, sepolia } from "viem/chains";
import { Providers } from "./Providers";
import { NetworkDashboard } from "./components/NetworkDashboard/NetworkDashboard";

const chainNameMap: Record<string, JBChainId> = {
  sepolia: sepolia.id,
  opsepolia: optimismSepolia.id,
};

export default function Page({
  params,
}: {
  params: { chain: string; id: string };
}) {
  const projectId = BigInt(params.id);
  const chainId = chainNameMap[params.chain.toLowerCase()];

  if (!chainId) {
    return <div>JB not deployed on this chain, sorry.</div>;
  }

  return (
    <Providers chainId={chainId} projectId={projectId}>
      <Nav />

      <NetworkDashboard />
    </Providers>
  );
}
